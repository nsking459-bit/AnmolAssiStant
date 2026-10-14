import { ChatMessage, PersonalityMode } from '../types/jarvis';

export interface ChatRequestOptions {
  message: string;
  history?: ChatMessage[];
  personality?: PersonalityMode;
  model?: string;
  apiKey?: string;
  memoryContext?: string;
  currentScreenContext?: string;
}

export interface ChatResponse {
  text: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, any>;
    id?: string;
  }>;
  error?: string;
}

export interface TTSResponse {
  audioBase64: string;
  mimeType: string;
}

export class GeminiService {
  async testKey(apiKey?: string): Promise<{ success: boolean; message: string; keySource?: string }> {
    const res = await fetch('/api/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to connect with Gemini API.');
    }
    return data;
  }

  async sendChatMessage(options: ChatRequestOptions): Promise<ChatResponse> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'JARVIS failed to process command.');
    }
    return data;
  }

  async synthesizeSpeech(text: string, voiceName = 'Zephyr', apiKey?: string): Promise<TTSResponse> {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName, apiKey }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to synthesize speech.');
    }
    return data;
  }

  async analyzeScreen(imageBase64: string, query?: string, apiKey?: string) {
    const res = await fetch('/api/screen-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, query, apiKey }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Screen analysis failed.');
    }
    return data;
  }

  async planMultiStepTask(goal: string, apiKey?: string) {
    const res = await fetch('/api/plan-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, apiKey }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Task decomposition failed.');
    }
    return data;
  }
}

export const geminiService = new GeminiService();
