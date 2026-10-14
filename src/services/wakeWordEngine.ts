import { soundEffects } from './audioUtils';

export interface WakeWordConfig {
  phrase: 'JARVIS' | 'Hey JARVIS';
  sensitivity: number;
  enabled: boolean;
  onWake: (detectedText: string, remainderCommand: string) => void;
  onStopCommand: () => void;
  onError?: (err: string) => void;
}

export class WakeWordEngine {
  private recognition: any = null;
  private isRunning = false;
  private config: WakeWordConfig;
  private restartTimeout: any = null;

  constructor(config: WakeWordConfig) {
    this.config = config;
  }

  public updateConfig(newConfig: Partial<WakeWordConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (!this.config.enabled && this.isRunning) {
      this.stop();
    } else if (this.config.enabled && !this.isRunning) {
      this.start();
    }
  }

  public start() {
    if (!this.config.enabled) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[WakeWordEngine] Web Speech API not supported in this browser.');
      this.config.onError?.('Speech recognition not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isRunning = true;
      };

      this.recognition.onresult = (event: any) => {
        const resultsLength = event.results.length;
        for (let i = event.resultIndex; i < resultsLength; i++) {
          const transcript = event.results[i][0]?.transcript?.trim().toLowerCase() || '';

          // 1. Instant Stop Detection
          if (
            transcript.includes('jarvis stop') ||
            transcript.includes('hey jarvis stop') ||
            transcript === 'stop' ||
            transcript.endsWith('stop')
          ) {
            console.log('[WakeWordEngine] Stop command detected:', transcript);
            this.config.onStopCommand();
            return;
          }

          // 2. Wake Word Detection ("jarvis", "hey jarvis")
          const targetPhrase = this.config.phrase.toLowerCase();
          const matchIndex = transcript.indexOf(targetPhrase);

          if (matchIndex !== -1 || (targetPhrase === 'hey jarvis' && transcript.includes('jarvis'))) {
            // Found wake word!
            soundEffects.playWakeChime();

            // Extract any command spoken in the same breath
            let remainder = '';
            if (matchIndex !== -1) {
              remainder = transcript.substring(matchIndex + targetPhrase.length).trim();
            } else if (transcript.includes('jarvis')) {
              remainder = transcript.substring(transcript.indexOf('jarvis') + 6).trim();
            }

            // Clean up leading punctuation/fillers
            remainder = remainder.replace(/^[,.\s]+/, '');

            console.log('[WakeWordEngine] Wake word triggered! Remainder:', remainder);
            this.config.onWake(transcript, remainder);
            break;
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        // 'no-speech' or 'aborted' are normal in continuous mode
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[WakeWordEngine] Recognition error:', event.error);
        }
      };

      this.recognition.onend = () => {
        this.isRunning = false;
        // Auto-restart if still enabled
        if (this.config.enabled) {
          this.restartTimeout = setTimeout(() => {
            this.start();
          }, 300);
        }
      };

      this.recognition.start();
    } catch (err: any) {
      console.error('[WakeWordEngine] Failed to start:', err);
      this.isRunning = false;
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
  }

  public isActive(): boolean {
    return this.isRunning;
  }
}
