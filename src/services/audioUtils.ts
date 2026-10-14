/**
 * Audio processing utilities for JARVIS
 * Handles 16kHz PCM input conversion for Gemini Live,
 * 24kHz PCM output decoding, audio queueing, and Web Audio synthesizers.
 */

export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return output.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function pcm16BitToFloat32(buffer: ArrayBuffer): Float32Array {
  const dataView = new DataView(buffer);
  const float32 = new Float32Array(buffer.byteLength / 2);
  for (let i = 0; i < float32.length; i++) {
    const int16 = dataView.getInt16(i * 2, true);
    float32[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7FFF;
  }
  return float32;
}

/**
 * High-tech futuristic audio cues synthesizer using Web Audio API
 */
class SoundEffectsService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Stark HUD activation chime
  playWakeChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.24);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      // Audio autoplay might be blocked
    }
  }

  // Interruption / stop sound
  playInterruptChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      // Ignore
    }
  }

  // Successful action execution beep
  playSuccessBeep() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {
      // Ignore
    }
  }

  // Calling mode connect chime
  playConnectChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(0, now + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.25);
      });
    } catch (e) {
      // Ignore
    }
  }
}

export const soundEffects = new SoundEffectsService();

/**
 * Progressive Audio Player for Gemini Live 24kHz PCM stream
 */
export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying = false;
  private onSpeakingStateChange?: (speaking: boolean) => void;

  constructor(onSpeakingChange?: (speaking: boolean) => void) {
    this.onSpeakingStateChange = onSpeakingChange;
  }

  private initContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public playPcmChunk(base64Pcm: string) {
    this.initContext();
    if (!this.audioCtx || !this.analyser) return;

    try {
      const buffer = base64ToArrayBuffer(base64Pcm);
      const float32 = pcm16BitToFloat32(buffer);

      if (float32.length === 0) return;

      const audioBuffer = this.audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);

      const currentTime = this.audioCtx.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.04;
      }

      source.start(this.nextPlayTime);
      this.activeSources.push(source);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onSpeakingStateChange?.(true);
      }

      const duration = audioBuffer.duration;
      this.nextPlayTime += duration;

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          this.onSpeakingStateChange?.(false);
        }
      };
    } catch (err) {
      console.error('[LiveAudioPlayer] Error playing PCM chunk:', err);
    }
  }

  public stopAndClear() {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // Source might have already finished
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onSpeakingStateChange?.(false);
    }
  }

  public getSpeakingState(): boolean {
    return this.isPlaying;
  }
}
