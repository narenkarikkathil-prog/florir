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
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName } },
          },
          systemInstruction: config.systemInstruction,
          inputAudioTranscription: { 
            enabled: !config.skipMic,
            languageCode: config.languageCode || 'en-US'
          } as any,
          outputAudioTranscription: { enabled: true } as any,
          tools: config.tools,
          generationConfig: {
            responseModalities: [Modality.AUDIO],
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
          turnDetection: {
            threshold: 0.3,
            silenceDurationMs: 500,
          } as any,
        } as any,
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
                  // NOTE: part.text in audio-only mode is the model's internal
                  // thinking/reasoning, NOT what it speaks. We intentionally skip it.
                  // The actual spoken words come via outputAudioTranscription below.
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

              // Handle AI output audio transcription (what the AI said)
              const outputParts = sc.outputAudioTranscription?.parts || sc.outputTranscription?.parts;
              if (outputParts) {
                for (const part of outputParts) {
                  if (part.text) config.onMessage(part.text, 'ai');
                }
              } else if (sc.outputAudioTranscription?.text) {
                config.onMessage(sc.outputAudioTranscription.text, 'ai');
              } else if (sc.outputTranscription?.text) {
                config.onMessage(sc.outputTranscription.text, 'ai');
              }

              // Handle user input audio transcription (what the user said)
              const userParts = sc.inputAudioTranscription?.parts || sc.inputTranscription?.parts;
              if (userParts) {
                for (const part of userParts) {
                  if (part.text) {
                    const cleaned = this.sanitizeTranscript(part.text);
                    if (cleaned) config.onMessage(cleaned, 'user');
                  }
                }
              } else if (sc.inputAudioTranscription?.text) {
                const cleaned = this.sanitizeTranscript(sc.inputAudioTranscription.text);
                if (cleaned) config.onMessage(cleaned, 'user');
              } else if (sc.inputTranscription?.text) {
                const cleaned = this.sanitizeTranscript(sc.inputTranscription.text);
                if (cleaned) config.onMessage(cleaned, 'user');
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

  private micSource: MediaStreamAudioSourceNode | null = null;
  private silentDest: GainNode | null = null;
  private micHealthInterval: ReturnType<typeof setInterval> | null = null;
  private lastMicActivity: number = 0;
  private currentMicConfig: any = null;

  pause() {
    // Disable mic tracks to stop sending audio, but keep the pipeline intact
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.enabled = false);
    }
  }

  resume() {
    // Re-enable mic tracks
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.enabled = true);
    }
    // Ensure AudioContext is running
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private async startMic(config: any) {
    this.currentMicConfig = config;
    try {
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_START_REQUEST' });

      // Ensure AudioContext is active
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Request mic with specific constraints for reliability
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_STREAM_ACQUIRED' });

      this.micSource = this.audioContext!.createMediaStreamSource(this.stream);
      this.processor = this.audioContext!.createScriptProcessor(1024, 1, 1);

      // Create a silent destination — ScriptProcessorNode MUST be connected
      // to a destination to fire onaudioprocess events. We use a GainNode
      // with gain=0 so no sound is heard but the processor stays active.
      this.silentDest = this.audioContext!.createGain();
      this.silentDest.gain.value = 0;
      this.silentDest.connect(this.audioContext!.destination);

      this.lastMicActivity = Date.now();

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // Track that audio is flowing (even silence has some tiny RMS)
        if (rms > 0.0001) {
          this.lastMicActivity = Date.now();
        }

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

      // Connect: mic → processor → silent gain → destination
      this.micSource.connect(this.processor);
      this.processor.connect(this.silentDest);
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_PROCESSOR_CONNECTED' });

      // Start mic health monitoring — auto-reconnect if audio stops
      this.startMicHealthCheck(config);

    } catch (err) {
      console.error("Mic access denied:", err);
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_ERROR', data: err });
    }
  }

  /**
   * Monitors mic health. If no audio activity for 5 seconds and the stream
   * is supposed to be active, attempt to reconnect.
   */
  private startMicHealthCheck(config: any) {
    if (this.micHealthInterval) clearInterval(this.micHealthInterval);

    this.micHealthInterval = setInterval(() => {
      // Only check if we're supposed to be active and not paused
      if (!this.session || !this.stream) return;
      const tracksEnabled = this.stream.getTracks().some(t => t.enabled && t.readyState === 'live');
      if (!tracksEnabled) return;

      const silentFor = Date.now() - this.lastMicActivity;
      if (silentFor > 5000) {
        console.warn('Mic appears dead (no audio for 5s), reconnecting...');
        if (config.onRawMessage) config.onRawMessage({ type: 'MIC_RECONNECT' });
        this.reconnectMic(config);
      }
    }, 3000);
  }

  private async reconnectMic(config: any) {
    // Clean up old mic
    try {
      if (this.processor) { this.processor.disconnect(); this.processor = null; }
      if (this.micSource) { this.micSource.disconnect(); this.micSource = null; }
      if (this.silentDest) { this.silentDest.disconnect(); this.silentDest = null; }
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
    } catch (e) { /* cleanup errors are ok */ }

    // Re-initialize
    await this.startMic(config);
  }

  /**
   * Strips non-speech artifacts from transcription text.
   * Returns cleaned text, or empty string if nothing meaningful remains.
   */
  private sanitizeTranscript(text: string): string {
    // Remove common non-speech tags: <noise>, <silence>, <unk>, [noise], etc.
    let cleaned = text
      .replace(/<[^>]*(?:noise|silence|unk|laughter|cough|breath|music)[^>]*>/gi, '')
      .replace(/\[[^\]]*(?:noise|silence|unk|laughter|cough|breath|music)[^\]]*\]/gi, '')
      .replace(/\([^)]*(?:noise|silence|unk|laughter|cough|breath)[^)]*\)/gi, '');
    // Remove stray angle-bracket tags that look like artifacts
    cleaned = cleaned.replace(/<[a-z_]+>/gi, '');
    // Collapse multiple spaces and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
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
    
    // Explicitly bump pitch up by 15% across all speeds to enforce a much higher-pitched voice naturally
    const PITCH_MULTIPLIER = 1.15;
    const actualRate = (this.playbackRate > 1.0 ? this.playbackRate : 1.0) * PITCH_MULTIPLIER;
    source.playbackRate.value = actualRate;
    source.connect(this.audioContext.destination);
    
    const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + (buffer.duration / actualRate);
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
    // Stop health monitoring
    if (this.micHealthInterval) {
      clearInterval(this.micHealthInterval);
      this.micHealthInterval = null;
    }
    if (this.session) this.session.close();
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.processor) this.processor.disconnect();
    if (this.micSource) this.micSource.disconnect();
    if (this.silentDest) this.silentDest.disconnect();
    if (this.audioContext) this.audioContext.close();
    this.session = null;
    this.stream = null;
    this.processor = null;
    this.micSource = null;
    this.silentDest = null;
    this.audioContext = null;
  }

  // TTS Methods
  async generateSpeech(text: string, voiceName?: string) {
    const finalVoice = voiceName || this.voiceName;
    
    // Simulate slow playback by adding literal pauses between words
    let finalText = text;
    if (this.playbackRate < 1.0) {
      finalText = text.split(' ').join('... ');
    } else if (this.playbackRate > 1.0) {
      finalText = `Say this very rapidly: ${text}`;
    } else {
      finalText = `Say clearly: ${text}`;
    }

    const response = await this.ttsAi.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: finalText }] }],
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
    if (!params.model) params.model = "gemini-2.5-flash";
    return this.liveAi.models.generateContent(params);
  }
}
