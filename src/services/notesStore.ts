import { Note } from '../types/jarvis';

const STORAGE_KEY = 'jarvis_notes_v1';

const DEFAULT_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Arc Reactor Core Diagnostics',
    content: 'Plasma output stabilizing at 98.4%. Ensure magnetic containment field harmonizers remain calibrated.',
    tags: ['diagnostics', 'hardware', 'core'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    createdViaVoice: false,
  },
  {
    id: 'note-2',
    title: 'Android AI Automation Protocol',
    content: 'Accessibility service permits click, scroll, and text entry actions. Verify sensitive communication before dispatch.',
    tags: ['automation', 'protocols', 'android'],
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
    createdViaVoice: true,
  },
];

export class NotesStore {
  private notes: Note[] = [];

  constructor() {
    this.loadNotes();
  }

  private loadNotes() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.notes = JSON.parse(data);
      } else {
        this.notes = [...DEFAULT_NOTES];
        this.saveToStorage();
      }
    } catch {
      this.notes = [...DEFAULT_NOTES];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes));
    } catch (e) {
      console.error('[NotesStore] Failed to save notes to storage:', e);
    }
  }

  public getNotes(): Note[] {
    return [...this.notes].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public getNoteById(id: string): Note | undefined {
    return this.notes.find((n) => n.id === id);
  }

  public searchNotes(query: string): Note[] {
    if (!query || !query.trim()) return this.getNotes();
    const q = query.toLowerCase().trim();
    return this.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  public createNote(title: string, content: string, tags: string[] = [], createdViaVoice = false): Note {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: title.trim(),
      content: content.trim(),
      tags: tags.map((t) => t.trim().toLowerCase()),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdViaVoice,
    };
    this.notes.unshift(newNote);
    this.saveToStorage();
    return newNote;
  }

  public updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tags'>>): Note | null {
    const index = this.notes.findIndex((n) => n.id === id);
    if (index === -1) return null;

    this.notes[index] = {
      ...this.notes[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveToStorage();
    return this.notes[index];
  }

  public deleteNote(id: string): boolean {
    const prevLen = this.notes.length;
    this.notes = this.notes.filter((n) => n.id !== id);
    if (this.notes.length !== prevLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public clearAllNotes() {
    this.notes = [];
    this.saveToStorage();
  }
}

export const notesStore = new NotesStore();
