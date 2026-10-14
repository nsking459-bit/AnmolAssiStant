export type JarvisStatus = 
  | 'STANDBY'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR';

export type PersonalityMode = 'normal' | 'serious' | 'companion';

export type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

export interface ToolCallData {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResultData {
  callId: string;
  name: string;
  result: unknown;
  success: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallData[];
  toolResults?: ToolResultData[];
  audioBase64?: string;
  isVoice?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  createdViaVoice: boolean;
}

export interface MemoryItem {
  id: string;
  category: 'preference' | 'fact' | 'instruction' | 'contact' | 'custom_command';
  key: string;
  value: string;
  timestamp: number;
}

export interface AndroidPermissionState {
  id: string;
  name: string;
  description: string;
  granted: boolean;
  required: boolean;
  category: 'microphone' | 'screen' | 'notifications' | 'contacts' | 'phone' | 'accessibility';
}

export interface ScreenElement {
  id: string;
  type: 'button' | 'input' | 'text' | 'image' | 'list' | 'icon';
  text: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  actionable: boolean;
  confidence: number;
}

export interface TaskStep {
  stepNumber: number;
  description: string;
  tool: string;
  params: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

export interface MultiStepTask {
  id: string;
  title: string;
  rawGoal: string;
  steps: TaskStep[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  currentStepIndex: number;
  createdAt: number;
  finalSummary?: string;
}

export interface AppSettings {
  geminiApiKey: string;
  hasCustomKey: boolean;
  chatModel: string;
  liveModel: string;
  ttsModel: string;
  voiceName: VoiceName;
  personality: PersonalityMode;
  formality: 'balanced' | 'formal' | 'casual';
  speakingSpeed: number;
  wakeWordEnabled: boolean;
  wakeWordPhrase: 'JARVIS' | 'Hey JARVIS';
  wakeWordSensitivity: number;
  continuousListening: boolean;
  autoSpeakResponses: boolean;
  memoryEnabled: boolean;
  requireConfirmationForSensitive: boolean;
  soundEffectsEnabled: boolean;
}

export interface DeviceTelemetry {
  batteryLevel: number | null;
  isCharging: boolean | null;
  networkOnline: boolean;
  connectionType: string;
  systemTime: string;
  screenLocked: boolean;
  audioOutputDevice: string;
}

export interface PendingConfirmation {
  id: string;
  actionType: 'call' | 'sms' | 'whatsapp' | 'email' | 'delete_memory' | 'wipe_notes';
  title: string;
  description: string;
  details: Record<string, string>;
  onConfirm: () => void;
  onCancel: () => void;
}
