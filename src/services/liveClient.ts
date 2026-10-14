import { JarvisStatus, VoiceName, PersonalityMode } from '../types/jarvis';
import { floatTo16BitPCM, arrayBufferToBase64, LiveAudioPlayer, soundEffects } from './audioUtils';

export interface LiveClientConfig {
  apiKey?: string;
  model?: string;
  voice?: VoiceName;
  personality?: PersonalityMode;
  onStatusChange?: (status: JarvisStatus) => void;
  onUserSpeech?: (transcript: string) => void;
  onJarvisTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onToolCall?: (toolCall: any) => void;
  onInterrupted?: () => void;
  onAudioLevels?: (inputLevel: number, outputLevel: number) => void;
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micProcessor: ScriptProcessorNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private player: LiveAudioPlayer;
  private config: LiveClientConfig;

  private isConnected = false;
  private isListening = false;
  private isSpeaking = false;
  private isProcessing = false;
  private micMuted = false;
  private animFrameId: number | null = null;

  // Interruption / Barge-in threshold
  private bargeInThreshold = 0.22;
  private lastBargeInTime = 0;

  constructor(config: LiveClientConfig) {
    this.config = config;
    this.player = new LiveAudioPlayer((speaking) => {
      this.isSpeaking = speaking;
      if (!speaking && this.isConnected && !this.micMuted) {
        // Automatically return to listening state once speaking finishes!
        this.setStatus('LISTENING');
      } else if (speaking) {
        this.setStatus('SPEAKING');
      }
    });
  }

  private setStatus(status: JarvisStatus) {
    this.config.onStatusChange?.(status);
  }

  public async startSession() {
    this.setStatus('CONNECTING');
    soundEffects.playConnectChime();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Send init message
        this.ws?.send(
          JSON.stringify({
            type: 'init',
            apiKey: this.config.apiKey,
            model: this.config.model || 'gemini-3.8-live',
            voice: this.config.voice || 'Zephyr',
            personality: this.config.personality || 'normal',
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            this.setStatus('LISTENING');
            this.startMicrophoneCapture();
            this.startVisualizerLoop();
          } else if (msg.type === 'status') {
            this.setStatus(msg.status);
          } else if (msg.type === 'audio') {
            // Received 24kHz PCM chunk from Gemini Live
            this.player.playPcmChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            this.handleBargeIn();
          } else if (msg.type === 'turnComplete') {
            // Turn completed
            if (!this.player.getSpeakingState()) {
              this.setStatus('LISTENING');
            }
          } else if (msg.type === 'toolCall') {
            this.config.onToolCall?.(msg.toolCall);
          } else if (msg.type === 'error') {
            console.error('[GeminiLiveSession error]', msg.error);
            this.setStatus('ERROR');
            this.config.onError?.(msg.error);
          }
        } catch (e) {
          console.error('[GeminiLiveSession] Error handling WS message:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.error('[GeminiLiveSession] WebSocket error:', e);
        this.setStatus('ERROR');
        this.config.onError?.('Real-time connection error.');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopMicrophoneCapture();
        this.player.stopAndClear();
        this.setStatus('STANDBY');
      };
    } catch (err: any) {
      this.setStatus('ERROR');
      this.config.onError?.(err?.message || 'Failed to start Live session.');
    }
  }

  private async startMicrophoneCapture() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx({ sampleRate: 16000 });
      await this.audioCtx.resume();

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
      this.inputAnalyser = this.audioCtx.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.inputAnalyser.smoothingTimeConstant = 0.5;
      this.micSource.connect(this.inputAnalyser);

      // 4096 buffer size at 16kHz ≈ 256ms chunk
      this.micProcessor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      this.micSource.connect(this.micProcessor);
      this.micProcessor.connect(this.audioCtx.destination);

      this.isListening = true;

      this.micProcessor.onaudioprocess = (e) => {
        if (!this.isConnected || this.micMuted) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Calculate RMS volume level
        let sum = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sum += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sum / inputChannelData.length);

        // BARGE-IN DETECTION:
        // If JARVIS is currently speaking and user speaks above threshold
        if (this.isSpeaking && rms > this.bargeInThreshold) {
          const now = Date.now();
          if (now - this.lastBargeInTime > 800) {
            this.lastBargeInTime = now;
            console.log('[GeminiLiveSession] Barge-in speech detected by client!');
            this.handleBargeIn();
          }
        }

        // Echo protection: when JARVIS is actively speaking loudly, do not feed back audio
        if (this.isSpeaking && rms < 0.28) {
          return;
        }

        // Convert 16kHz Float32 to 16-bit PCM and encode to Base64
        const pcmBuffer = floatTo16BitPCM(inputChannelData);
        const base64Audio = arrayBufferToBase64(pcmBuffer);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'audio', audio: base64Audio }));
        }
      };
    } catch (err: any) {
      console.error('[GeminiLiveSession] Mic capture error:', err);
      this.config.onError?.('Microphone access denied or unavailable.');
    }
  }

  // Handle natural interruption / "JARVIS, stop"
  public handleBargeIn() {
    this.player.stopAndClear();
    this.setStatus('INTERRUPTED');
    soundEffects.playInterruptChime();

    // Signal server to interrupt model generation
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }

    this.config.onInterrupted?.();

    // Quickly resume listening for next command
    setTimeout(() => {
      if (this.isConnected && !this.micMuted) {
        this.setStatus('LISTENING');
      }
    }, 400);
  }

  public sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.setStatus('THINKING');
      this.ws.send(JSON.stringify({ type: 'text', text }));
    }
  }

  public sendToolResponse(response: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'toolResponse', response }));
    }
  }

  public toggleMute(): boolean {
    this.micMuted = !this.micMuted;
    return this.micMuted;
  }

  public isMicMuted(): boolean {
    return this.micMuted;
  }

  private startVisualizerLoop() {
    const updateLevels = () => {
      let inputLevel = 0;
      let outputLevel = 0;

      if (this.inputAnalyser && !this.micMuted) {
        const inputData = new Uint8Array(this.inputAnalyser.frequencyBinCount);
        this.inputAnalyser.getByteFrequencyData(inputData);
        const avg = inputData.reduce((a, b) => a + b, 0) / inputData.length;
        inputLevel = avg / 255;
      }

      if (this.player.analyser && this.isSpeaking) {
        const outputData = new Uint8Array(this.player.analyser.frequencyBinCount);
        this.player.analyser.getByteFrequencyData(outputData);
        const avg = outputData.reduce((a, b) => a + b, 0) / outputData.length;
        outputLevel = avg / 255;
      }

      this.config.onAudioLevels?.(inputLevel, outputLevel);
      this.animFrameId = requestAnimationFrame(updateLevels);
    };

    this.animFrameId = requestAnimationFrame(updateLevels);
  }

  private stopMicrophoneCapture() {
    if (this.micProcessor) {
      this.micProcessor.disconnect();
      this.micProcessor = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public endSession() {
    this.stopMicrophoneCapture();
    this.player.stopAndClear();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.setStatus('STANDBY');
    soundEffects.playInterruptChime();
  }
}
