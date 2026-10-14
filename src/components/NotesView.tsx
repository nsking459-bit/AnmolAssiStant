import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Mic, 
  Tag, 
  Calendar, 
  Check, 
  X,
  Sparkles
} from 'lucide-react';
import { Note } from '../types/jarvis';
import { notesStore } from '../services/notesStore';
import { soundEffects } from '../services/audioUtils';

interface NotesViewProps {
  onSpeakNote?: (text: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ onSpeakNote }) => {
  const [notes, setNotes] = useState<Note[]>(notesStore.getNotes());
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  const refreshNotes = () => {
    setNotes(notesStore.searchNotes(searchQuery));
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setNotes(notesStore.searchNotes(q));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const tagsArr = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    notesStore.createNote(newTitle, newContent, tagsArr, false);
    soundEffects.playSuccessBeep();

    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setIsCreating(false);
    refreshNotes();
  };

  const handleDelete = (id: string) => {
    notesStore.deleteNote(id);
    soundEffects.playInterruptChime();
    refreshNotes();
  };

  const handleSaveEdit = (id: string) => {
    notesStore.updateNote(id, {
      title: newTitle,
      content: newContent,
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    soundEffects.playSuccessBeep();
    setEditingNoteId(null);
    refreshNotes();
  };

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setNewTitle(note.title);
    setNewContent(note.content);
    setNewTags(note.tags.join(', '));
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-900/30">
        <div>
          <h2 className="font-hud font-bold text-base sm:text-lg text-cyan-200 uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>JARVIS Notes Vault</span>
          </h2>
          <p className="text-xs font-mono-tech text-gray-400">
            Voice-commanded and encrypted local memory notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search notes..."
              className="bg-gray-950/80 border border-cyan-900/40 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono-tech text-gray-200 focus:outline-none focus:border-cyan-400 w-44 sm:w-56"
            />
          </div>

          <button
            onClick={() => {
              setIsCreating(!isCreating);
              setEditingNoteId(null);
              setNewTitle('');
              setNewContent('');
              setNewTags('');
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-hud text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Creation / Edit Form Modal or Card */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="glass-panel p-4 rounded-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-hud text-xs uppercase tracking-wider text-cyan-300 font-semibold">
              Create New Note
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Note Title (e.g. Arc Reactor Flux Measurements)"
            className="w-full bg-gray-950/80 border border-cyan-900/50 rounded-lg px-3 py-2 text-xs font-sans text-gray-100 focus:outline-none focus:border-cyan-400"
            required
          />

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Note Content (or say 'JARVIS, remember this note...')"
            rows={3}
            className="w-full bg-gray-950/80 border border-cyan-900/50 rounded-lg px-3 py-2 text-xs font-sans text-gray-100 focus:outline-none focus:border-cyan-400"
            required
          />

          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags comma-separated (e.g. diagnostics, urgent, stark)"
            className="w-full bg-gray-950/80 border border-cyan-900/50 rounded-lg px-3 py-2 text-xs font-mono-tech text-gray-300 focus:outline-none focus:border-cyan-400"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded text-xs font-mono-tech text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-hud text-xs uppercase font-semibold"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="text-center py-12 glass-panel rounded-2xl border border-cyan-900/30">
          <FileText className="w-8 h-8 mx-auto text-cyan-400/50 mb-2" />
          <h4 className="font-hud text-sm uppercase text-gray-300">No notes found</h4>
          <p className="text-xs font-mono-tech text-gray-500 mt-1">
            Say "JARVIS, create a note..." or click "+ New Note" above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => {
            const isEditing = editingNoteId === note.id;

            return (
              <div
                key={note.id}
                className="glass-panel p-4 rounded-xl border border-cyan-900/40 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-gray-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white"
                    />
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={3}
                      className="w-full bg-gray-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      className="w-full bg-gray-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-2 py-1 text-xs text-gray-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        className="px-3 py-1 bg-cyan-600 rounded text-xs text-white"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      {/* Note Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-hud font-bold text-sm text-cyan-100 tracking-wide">
                          {note.title}
                        </h4>

                        <div className="flex items-center gap-1 text-gray-400">
                          {note.createdViaVoice && (
                            <span
                              className="p-1 text-cyan-400"
                              title="Created via Voice Command"
                            >
                              <Mic className="w-3.5 h-3.5" />
                            </span>
                          )}

                          <button
                            onClick={() => startEdit(note)}
                            className="p-1 hover:text-cyan-300"
                            title="Edit Note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1 hover:text-rose-400"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-xs font-sans text-gray-300 leading-relaxed mb-3 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>

                    {/* Footer metadata & tags */}
                    <div className="pt-2 border-t border-cyan-900/30 flex items-center justify-between text-[11px] font-mono-tech text-gray-400">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-[10px] text-cyan-300"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <span className="text-[10px]">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
