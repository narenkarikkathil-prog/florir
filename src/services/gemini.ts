import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export class GeminiService {
  private liveAi: GoogleGenAI;
  private ttsAi: GoogleGenAI;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime: number = 0;
  private playbackRate: number = 1.0;
  private voiceName: string = "Kore";

  constructor(liveKey: string, ttsKey?: string) {
    this.liveAi = new GoogleGenAI({ apiKey: liveKey });
    this.ttsAi = new GoogleGenAI({ apiKey: ttsKey || liveKey });
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
  }

  getVoiceName() {
    return this.voiceName;
  }

  setVoiceName(name: string) {
    this.voiceName = name;
  }

  // Live API Methods
  async connect(config: {
    systemInstruction: string;
    onMessage: (text: string, role: 'user' | 'ai', toolCall?: { name: string; args: any }) => void;
    onInterruption: () => void;
    onAudioData?: (base64: string) => void;
    onRawMessage?: (message: any) => void;
    onVolume?: (volume: number) => void;
    voiceName?: string;
    languageCode?: string;
    tools?: any[];
    skipMic?: boolean;
    initialMessage?: string;
  }) {
    if (config.onRawMessage) config.onRawMessage({ type: 'CONNECT_START', voice: config.voiceName || this.voiceName });
    if (config.voiceName) this.voiceName = config.voiceName;
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.nextStartTime = this.audioContext.currentTime;

    try {
      if (config.onRawMessage) config.onRawMessage({ type: 'AI_LIVE_CONNECT_CALL' });
      this.session = await this.liveAi.live.connect({
        model: "gemini-2.0-flash-exp",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName } },
          },
          systemInstruction: config.systemInstruction,
          inputAudioTranscription: { 
            enabled: !config.skipMic,
            languageCode: config.languageCode || 'auto'
          } as any,
          outputAudioTranscription: { enabled: true } as any,
          tools: config.tools,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connection Opened");
            if (config.onRawMessage) config.onRawMessage({ type: 'CONNECTION_OPEN' });
            if (!config.skipMic) {
              this.startMic(config);
            }
            if (config.initialMessage) {
              setTimeout(() => {
                this.sendText(config.initialMessage!);
              }, 500);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (config.onRawMessage) config.onRawMessage(message);
            
            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                config.onMessage('', 'ai', { name: call.name, args: call.args });
              }
            }

            if (message.serverContent) {
              const sc = message.serverContent as any;
              const { modelTurn, userContent, interrupted } = sc;
              
              if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                  if (part.text) {
                    config.onMessage(part.text, 'ai');
                  }
                  if (part.inlineData?.data) {
                    this.playAudio(part.inlineData.data);
                    if (config.onAudioData) config.onAudioData(part.inlineData.data);
                  }
                  const call = part.call || part.functionCall;
                  if (call) {
                    config.onMessage('', 'ai', { name: call.name, args: call.args });
                  }
                }
              }
              
              const userParts = sc.inputAudioTranscription?.parts || sc.inputTranscription?.parts;
              if (userParts) {
                for (const part of userParts) {
                  if (part.text) config.onMessage(part.text, 'user');
                }
              } else if (sc.inputAudioTranscription?.text) {
                config.onMessage(sc.inputAudioTranscription.text, 'user');
              } else if (sc.inputTranscription?.text) {
                config.onMessage(sc.inputTranscription.text, 'user');
              }

              if (interrupted) {
                config.onInterruption();
                this.stopPlayback();
              }
            }
          },
          onerror: (error) => {
            console.error("Gemini Live Error:", error);
            if (config.onRawMessage) config.onRawMessage({ type: 'ERROR', data: error });
          },
          onclose: () => this.stop(),
        },
      });
    } catch (err) {
      console.error("Gemini Live Connect Error:", err);
      if (config.onRawMessage) config.onRawMessage({ type: 'CONNECT_ERROR', data: err });
      throw err;
    }
  }

  pause() {
    if (this.processor) {
      this.processor.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.enabled = false);
    }
  }

  resume() {
    if (this.processor && this.audioContext) {
      this.processor.connect(this.audioContext.destination);
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.enabled = true);
    }
  }

  private async startMic(config: any) {
    try {
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_START_REQUEST' });
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_STREAM_ACQUIRED' });
      const source = this.audioContext!.createMediaStreamSource(this.stream);
      this.processor = this.audioContext!.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        if (config.onVolume) {
          config.onVolume(rms);
        }

        const pcmData = this.floatTo16BitPCM(inputData);
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        
        if (this.session) {
          this.session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext!.destination);
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_PROCESSOR_CONNECTED' });
    } catch (err) {
      console.error("Mic access denied:", err);
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_ERROR', data: err });
    }
  }

  private floatTo16BitPCM(input: Float32Array) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  private playAudio(base64: string) {
    if (!this.audioContext) return;
    
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const pcm = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768.0;

    const buffer = this.audioContext.createBuffer(1, float32.length, 16000);
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this.playbackRate;
    source.connect(this.audioContext.destination);
    
    const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + (buffer.duration / this.playbackRate);
  }

  private stopPlayback() {
    this.nextStartTime = this.audioContext?.currentTime || 0;
  }

  sendText(text: string) {
    if (this.session) {
      this.session.sendRealtimeInput({
        text
      });
    }
  }

  stop() {
    if (this.session) this.session.close();
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.processor) this.processor.disconnect();
    if (this.audioContext) this.audioContext.close();
    this.session = null;
    this.stream = null;
    this.processor = null;
    this.audioContext = null;
  }

  // TTS Methods
  async generateSpeech(text: string, voiceName?: string) {
    const finalVoice = voiceName || this.voiceName;
    const response = await this.ttsAi.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: finalVoice },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }

  // Content Generation Methods
  async generateContent(params: any) {
    if (!params.model) params.model = "gemini-2.0-flash-exp";
    return this.liveAi.models.generateContent(params);
  }
}
