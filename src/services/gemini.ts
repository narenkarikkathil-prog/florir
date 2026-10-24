import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

let cachedToken = "";

/**
 * Resolves a token for client-side Live Audio connection.
 * Communicates with the serverless backend /api/gemini/token which holds
 * the private GEMINI_API_KEY securely on the server.
 */
export async function getGeminiApiKey(): Promise<string> {
  if (cachedToken) return cachedToken;

  try {
    const res = await fetch("/api/gemini/token");
    if (res.ok) {
      const data = await res.json();
      const resolved = data.token || data.apiKey;
      if (resolved && typeof resolved === "string" && resolved.trim()) {
        cachedToken = resolved.trim();
        return cachedToken;
      }
    }
  } catch {
    // Network or offline fallback
  }

  return "";
}

export class GeminiService {
  private liveAi: GoogleGenAI | null = null;
  private ttsAi: GoogleGenAI | null = null;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime: number = 0;
  private playbackRate: number = 1.0;
  private voiceName: string = "Kore";
  private deviceChangeListenerAdded: boolean = false;
  private boundHandleDeviceChange: (() => void) | null = null;
  private activeAudioSources: Set<AudioBufferSourceNode> = new Set();

  constructor(apiKeyOrToken?: string) {
    if (apiKeyOrToken) {
      this.liveAi = new GoogleGenAI({ apiKey: apiKeyOrToken });
      this.ttsAi = new GoogleGenAI({ apiKey: apiKeyOrToken });
    }
  }

  static async create(customApiKey?: string): Promise<GeminiService> {
    const token = customApiKey || await getGeminiApiKey();
    return new GeminiService(token || undefined);
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
      if (!this.liveAi) {
        const token = await getGeminiApiKey();
        if (token) {
          this.liveAi = new GoogleGenAI({ apiKey: token });
        } else {
          throw new Error('GEMINI_API_KEY is not configured in your server environment variables.');
        }
      }

      if (config.onRawMessage) config.onRawMessage({ type: 'AI_LIVE_CONNECT_CALL' });
      this.session = await this.liveAi.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName } },
          },
          systemInstruction: { parts: [{text: config.systemInstruction}] },
          tools: config.tools,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
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
                try {
                  if (this.session && typeof this.session.sendToolResponse === 'function') {
                    this.session.sendToolResponse({
                      functionResponses: [{
                        id: call.id,
                        name: call.name,
                        response: { output: { received: true } }
                      }]
                    });
                  }
                } catch (e) {
                  console.warn("Failed to send tool response:", e);
                }
              }
            }

            if (message.serverContent) {
              const sc = message.serverContent as any;
              const { modelTurn, userContent, interrupted } = sc;
              
              if (interrupted) {
                this.stopPlayback();
                config.onInterruption();
              }

              if (modelTurn?.parts && !interrupted) {
                for (const part of modelTurn.parts) {
                  if (part.inlineData?.data) {
                    this.playAudio(part.inlineData.data);
                    if (config.onAudioData) config.onAudioData(part.inlineData.data);
                  }
                  const call = part.call || part.functionCall;
                  if (call) {
                    config.onMessage('', 'ai', { name: call.name, args: call.args });
                    try {
                      if (this.session && typeof this.session.sendToolResponse === 'function') {
                        this.session.sendToolResponse({
                          functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: { output: { received: true } }
                          }]
                        });
                      }
                    } catch (e) {
                      console.warn("Failed to send tool response:", e);
                    }
                  }
                }
              }

              if (!interrupted) {
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
              }

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
    this.stopPlayback();
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.enabled = false);
    }
  }

  resume() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.enabled = true);
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private async startMic(config: any) {
    this.currentMicConfig = config;
    try {
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_START_REQUEST' });

      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      const localSettings = localStorage.getItem('user_settings');
      const microphoneId = localSettings ? JSON.parse(localSettings).microphone_id : null;
      
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (microphoneId) {
        audioConstraints.deviceId = { exact: microphoneId };
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_STREAM_ACQUIRED' });

      this.micSource = this.audioContext!.createMediaStreamSource(this.stream);
      this.processor = this.audioContext!.createScriptProcessor(1024, 1, 1);

      this.silentDest = this.audioContext!.createGain();
      this.silentDest.gain.value = 0;
      this.silentDest.connect(this.audioContext!.destination);

      this.lastMicActivity = Date.now();

      this.processor.onaudioprocess = (e) => {
        this.lastMicActivity = Date.now();
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

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

      this.micSource.connect(this.processor);
      this.processor.connect(this.silentDest);
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_PROCESSOR_CONNECTED' });

      this.startMicHealthCheck(config);

      if (navigator.mediaDevices && !this.deviceChangeListenerAdded) {
        this.boundHandleDeviceChange = () => {
          console.log('Microphone device change detected, reconnecting...');
          this.reconnectMic(this.currentMicConfig);
        };
        navigator.mediaDevices.addEventListener('devicechange', this.boundHandleDeviceChange);
        this.deviceChangeListenerAdded = true;
      }

    } catch (err) {
      console.error("Mic access denied:", err);
      if (config.onRawMessage) config.onRawMessage({ type: 'MIC_ERROR', data: err });
    }
  }

  private startMicHealthCheck(config: any) {
    if (this.micHealthInterval) clearInterval(this.micHealthInterval);

    this.micHealthInterval = setInterval(() => {
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
    try {
      if (this.processor) { this.processor.disconnect(); this.processor = null; }
      if (this.micSource) { this.micSource.disconnect(); this.micSource = null; }
      if (this.silentDest) { this.silentDest.disconnect(); this.silentDest = null; }
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
    } catch (e) {}

    await this.startMic(config);
  }

  private sanitizeTranscript(text: string): string {
    let cleaned = text
      .replace(/<[^>]*(?:noise|silence|unk|laughter|cough|breath|music)[^>]*>/gi, '')
      .replace(/\[[^\]]*(?:noise|silence|unk|laughter|cough|breath|music)[^\]]*\]/gi, '')
      .replace(/\([^)]*(?:noise|silence|unk|laughter|cough|breath)[^)]*\)/gi, '');
    cleaned = cleaned.replace(/<[a-z_]+>/gi, '');
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
    
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

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
      
      const PITCH_MULTIPLIER = 1.15;
      const actualRate = (this.playbackRate > 1.0 ? this.playbackRate : 1.0) * PITCH_MULTIPLIER;
      source.playbackRate.value = actualRate;
      source.connect(this.audioContext.destination);

      this.activeAudioSources.add(source);
      source.onended = () => {
        this.activeAudioSources.delete(source);
      };
      
      const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + (buffer.duration / actualRate);
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  }

  public stopPlayback() {
    for (const source of this.activeAudioSources) {
      try {
        source.onended = null;
        source.stop(0);
        source.disconnect();
      } catch (e) {
        // Source already ended or stopped
      }
    }
    this.activeAudioSources.clear();
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
    this.stopPlayback();
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
    
    if (this.boundHandleDeviceChange) {
      navigator.mediaDevices?.removeEventListener('devicechange', this.boundHandleDeviceChange);
      this.boundHandleDeviceChange = null;
      this.deviceChangeListenerAdded = false;
    }

    this.session = null;
    this.stream = null;
    this.processor = null;
    this.micSource = null;
    this.silentDest = null;
    this.audioContext = null;
  }

  // TTS Methods (Proxied through backend server to keep API key private)
  async generateSpeech(text: string, voiceName?: string, lang?: string): Promise<string | null> {
    const finalVoice = voiceName || this.voiceName;

    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: finalVoice,
          rate: this.playbackRate,
          lang,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'TTS request failed' }));
        throw new Error(err.error || `TTS failed with status ${res.status}`);
      }

      const data = await res.json();
      return data.audio || null;
    } catch (e) {
      if (this.ttsAi) {
        let finalText = text;
        if (this.playbackRate < 1.0) {
          finalText = text.split(' ').join('... ');
        } else if (this.playbackRate > 1.0) {
          finalText = `Say this very rapidly: ${text}`;
        } else {
          finalText = `Say clearly: ${text}`;
        }
        const response = await this.ttsAi.models.generateContent({
          model: "gemini-3.5-flash",
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
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      }
      throw e;
    }
  }

  // Content Generation Methods (Proxied through backend server to keep API key private)
  async generateContent(params: any): Promise<{ text: string }> {
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation request failed' }));
        throw new Error(err.error || `Generation failed with status ${res.status}`);
      }

      return await res.json();
    } catch (e) {
      if (this.liveAi) {
        if (!params.model) params.model = "gemini-3.5-flash-lite";
        const response = await this.liveAi.models.generateContent(params);
        return { text: response.text || '' };
      }
      throw e;
    }
  }
}
