import { soundEffects } from './audioUtils';

export interface ContinuousListenerCallbacks {
  onSpeechStart: () => void;
  onInterimTranscript: (interim: string) => void;
  onFinalCommand: (command: string) => void;
  onStopPhrase: () => void;
  onError: (error: string) => void;
}

export class ContinuousSpeechEngine {
  private recognition: any = null;
  private isListening = false;
  private callbacks: ContinuousListenerCallbacks;
  private silenceTimer: any = null;
  private currentTranscript = '';
  private isAutoRestarting = true;
  private isSpeakingMode = false;

  constructor(callbacks: ContinuousListenerCallbacks) {
    this.callbacks = callbacks;
  }

  public setSpeakingMode(speaking: boolean) {
    this.isSpeakingMode = speaking;
  }

  public start() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.callbacks.onError('Speech Recognition API not supported in this environment.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onSpeechStart();
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';

          if (item.isFinal) {
            finalChunk += ' ' + text;
          } else {
            interim += text;
          }
        }

        const activeText = (finalChunk || interim).trim();

        // 1. Natural Interruption / Barge-in check
        const lower = activeText.toLowerCase();
        if (
          lower === 'stop' ||
          lower === 'jarvis stop' ||
          lower === 'hey jarvis stop' ||
          lower.endsWith('stop') ||
          lower.includes('quiet') ||
          lower.includes('halt')
        ) {
          console.log('[ContinuousSpeech] User said stop/interrupt!');
          soundEffects.playInterruptChime();
          this.callbacks.onStopPhrase();
          this.currentTranscript = '';
          return;
        }

        // If JARVIS is speaking and user speaks anything meaningful:
        if (this.isSpeakingMode && activeText.length > 2) {
          console.log('[ContinuousSpeech] Barge-in speech during AI utterance:', activeText);
          this.callbacks.onStopPhrase();
        }

        if (interim) {
          this.callbacks.onInterimTranscript(interim);
        }

        // Silence detection for end-of-speech:
        // Reset timer whenever user is still uttering words
        if (activeText.length > 0) {
          this.currentTranscript = activeText;
          if (this.silenceTimer) clearTimeout(this.silenceTimer);

          // 1200ms of silence indicates end of command
          this.silenceTimer = setTimeout(() => {
            if (this.currentTranscript.trim()) {
              const commandToSend = this.currentTranscript.trim();
              this.currentTranscript = '';
              this.callbacks.onFinalCommand(commandToSend);
            }
          }, 1100);
        }
      };

      this.recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[ContinuousSpeech] Error:', e.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Keep listening loop continuous!
        if (this.isAutoRestarting) {
          setTimeout(() => {
            try {
              if (this.isAutoRestarting && !this.isListening) {
                this.recognition?.start();
              }
            } catch (err) {
              // Ignore already started
            }
          }, 300);
        }
      };

      this.isAutoRestarting = true;
      this.recognition.start();
    } catch (err: any) {
      console.error('[ContinuousSpeech] Start error:', err);
      this.isListening = false;
      this.callbacks.onError(err?.message || 'Could not start microphone listener.');
    }
  }

  public stop() {
    this.isAutoRestarting = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
    this.isListening = false;
  }

  public getListening(): boolean {
    return this.isListening;
  }
}
