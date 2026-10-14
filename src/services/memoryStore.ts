import { MemoryItem } from '../types/jarvis';

const MEMORY_STORAGE_KEY = 'jarvis_longterm_memory_v1';

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-creator',
    category: 'fact',
    key: 'creator_identity',
    value: 'JARVIS was created and engineered by A. Anmol Kumar (affectionately called "Smarty" and "Golu"). He is my creator, boss, and master.',
    timestamp: Date.now() - 86400000 * 5,
  },
  {
    id: 'mem-creator-family',
    category: 'fact',
    key: 'creator_family',
    value: "Creator's Father: Ajith Kumar. Creator's Mother: A. Nirmala (A.nimala). They are to be addressed with the utmost honor and respect.",
    timestamp: Date.now() - 86400000 * 5,
  },
  {
    id: 'mem-1',
    category: 'preference',
    key: 'user_title',
    value: 'User / Creator is A. Anmol Kumar (Smarty / Golu). Address respectfully as Sir, Boss, or Anmol Sir.',
    timestamp: Date.now() - 86400000 * 3,
  },
  {
    id: 'mem-2',
    category: 'preference',
    key: 'response_style',
    value: 'Keep vocal responses brief, witty, loyal, and technologically sharp.',
    timestamp: Date.now() - 86400000 * 2,
  },
  {
    id: 'mem-4',
    category: 'fact',
    key: 'primary_system',
    value: 'JARVIS core intelligence operating on Google Gemini with real-time audio synthesis.',
    timestamp: Date.now() - 3600000 * 4,
  },
];

export class MemoryStore {
  private memories: MemoryItem[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const data = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (data) {
        this.memories = JSON.parse(data);
      } else {
        this.memories = [...DEFAULT_MEMORIES];
        this.save();
      }
    } catch {
      this.memories = [...DEFAULT_MEMORIES];
    }
  }

  private save() {
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.memories));
    } catch (e) {
      console.error('[MemoryStore] Failed to save memories:', e);
    }
  }

  public getMemories(): MemoryItem[] {
    return [...this.memories].sort((a, b) => b.timestamp - a.timestamp);
  }

  public saveMemory(
    category: MemoryItem['category'],
    key: string,
    value: string
  ): MemoryItem {
    // Check if key exists; update or insert
    const existingIndex = this.memories.findIndex(
      (m) => m.category === category && m.key.toLowerCase() === key.toLowerCase()
    );

    const item: MemoryItem = {
      id: existingIndex !== -1 ? this.memories[existingIndex].id : `mem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      category,
      key: key.trim(),
      value: value.trim(),
      timestamp: Date.now(),
    };

    if (existingIndex !== -1) {
      this.memories[existingIndex] = item;
    } else {
      this.memories.unshift(item);
    }

    this.save();
    return item;
  }

  public deleteMemory(id: string): boolean {
    const prevLen = this.memories.length;
    this.memories = this.memories.filter((m) => m.id !== id);
    if (this.memories.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  public clearAllMemories() {
    this.memories = [];
    this.save();
  }

  public getMemoryContextForPrompt(): string {
    if (this.memories.length === 0) return '';
    return this.memories
      .map((m) => `[${m.category.toUpperCase()} - ${m.key}]: ${m.value}`)
      .join('\n');
  }
}

export const memoryStore = new MemoryStore();
