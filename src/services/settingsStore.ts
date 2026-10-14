import { AppSettings, AndroidPermissionState } from '../types/jarvis';

const SETTINGS_KEY = 'jarvis_app_settings_v1';
const PERMISSIONS_KEY = 'jarvis_permissions_state_v1';

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  hasCustomKey: false,
  chatModel: 'gemini-3-flash-preview',
  liveModel: 'gemini-3.8-live',
  ttsModel: 'gemini-3.8-flash-lite-tts',
  voiceName: 'Zephyr',
  personality: 'normal',
  formality: 'balanced',
  speakingSpeed: 1.0,
  wakeWordEnabled: true,
  wakeWordPhrase: 'JARVIS',
  wakeWordSensitivity: 0.7,
  continuousListening: true,
  autoSpeakResponses: true,
  memoryEnabled: true,
  requireConfirmationForSensitive: true,
  soundEffectsEnabled: true,
};

const DEFAULT_PERMISSIONS: AndroidPermissionState[] = [
  {
    id: 'perm-mic',
    name: 'RECORD_AUDIO',
    description: 'Enables continuous voice recognition and real-time Gemini Live audio streaming.',
    granted: false,
    required: true,
    category: 'microphone',
  },
  {
    id: 'perm-accessibility',
    name: 'Accessibility Service',
    description: 'Allows JARVIS to read UI elements, detect screen buttons, and automate taps and scrolling.',
    granted: true,
    required: true,
    category: 'accessibility',
  },
  {
    id: 'perm-screen',
    name: 'Screen Capture & Reading',
    description: 'Allows JARVIS to inspect active Android app screens with multimodal vision.',
    granted: false,
    required: false,
    category: 'screen',
  },
  {
    id: 'perm-notifications',
    name: 'Notification Listener',
    description: 'Permits reading and synthesizing incoming notifications.',
    granted: true,
    required: false,
    category: 'notifications',
  },
  {
    id: 'perm-phone',
    name: 'Phone & SMS Intents',
    description: 'Allows preparing phone calls, sending SMS messages, and launching messaging apps.',
    granted: true,
    required: true,
    category: 'phone',
  },
  {
    id: 'perm-contacts',
    name: 'Contacts Access',
    description: 'Facilitates fast contact lookup for calls and messages.',
    granted: true,
    required: false,
    category: 'contacts',
  },
];

export class SettingsStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private permissions: AndroidPermissionState[] = [...DEFAULT_PERMISSIONS];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(s) };
      }
      const p = localStorage.getItem(PERMISSIONS_KEY);
      if (p) {
        this.permissions = JSON.parse(p);
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
      this.permissions = [...DEFAULT_PERMISSIONS];
    }
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('[SettingsStore] Failed to save settings:', e);
    }
    return { ...this.settings };
  }

  public setApiKey(key: string): AppSettings {
    const cleanKey = key.trim();
    return this.updateSettings({
      geminiApiKey: cleanKey,
      hasCustomKey: Boolean(cleanKey),
    });
  }

  public clearApiKey(): AppSettings {
    return this.updateSettings({
      geminiApiKey: '',
      hasCustomKey: false,
    });
  }

  public getPermissions(): AndroidPermissionState[] {
    return [...this.permissions];
  }

  public togglePermission(id: string): AndroidPermissionState[] {
    this.permissions = this.permissions.map((p) =>
      p.id === id ? { ...p, granted: !p.granted } : p
    );
    try {
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(this.permissions));
    } catch (e) {}
    return [...this.permissions];
  }

  public setPermissionGranted(id: string, granted: boolean): AndroidPermissionState[] {
    this.permissions = this.permissions.map((p) =>
      p.id === id ? { ...p, granted } : p
    );
    try {
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(this.permissions));
    } catch (e) {}
    return [...this.permissions];
  }
}

export const settingsStore = new SettingsStore();
