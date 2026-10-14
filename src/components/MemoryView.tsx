import React, { useState } from 'react';
import { 
  Database, 
  Trash2, 
  Plus, 
  X, 
  Brain, 
  Check, 
  AlertTriangle,
  Sliders,
  ShieldCheck,
  Bookmark
} from 'lucide-react';
import { MemoryItem } from '../types/jarvis';
import { memoryStore } from '../services/memoryStore';
import { soundEffects } from '../services/audioUtils';

interface MemoryViewProps {
  onClearAll: () => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ onClearAll }) => {
  const [memories, setMemories] = useState<MemoryItem[]>(memoryStore.getMemories());
  const [isAdding, setIsAdding] = useState(false);
  const [category, setCategory] = useState<MemoryItem['category']>('preference');
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');

  const refresh = () => {
    setMemories(memoryStore.getMemories());
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !val.trim()) return;

    memoryStore.saveMemory(category, key, val);
    soundEffects.playSuccessBeep();
    setKey('');
    setVal('');
    setIsAdding(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    memoryStore.deleteMemory(id);
    soundEffects.playInterruptChime();
    refresh();
  };

  const getCategoryColor = (cat: MemoryItem['category']) => {
    switch (cat) {
      case 'preference':
        return 'text-cyan-300 border-cyan-800 bg-cyan-950/50';
      case 'fact':
        return 'text-emerald-300 border-emerald-800 bg-emerald-950/50';
      case 'contact':
        return 'text-purple-300 border-purple-800 bg-purple-950/50';
      case 'custom_command':
        return 'text-amber-300 border-amber-800 bg-amber-950/50';
      default:
        return 'text-gray-300 border-gray-800 bg-gray-900';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-900/30">
        <div>
          <h2 className="font-hud font-bold text-base sm:text-lg text-cyan-200 uppercase tracking-widest flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            <span>Long-Term Memory Core</span>
          </h2>
          <p className="text-xs font-mono-tech text-gray-400">
            Cross-session persistent context injected into Gemini reasoning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-hud text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Memory</span>
          </button>

          <button
            onClick={onClearAll}
            disabled={memories.length === 0}
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 font-hud text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Add Memory Form */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="glass-panel p-4 rounded-xl border border-cyan-500/40 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-hud text-xs uppercase tracking-wider text-cyan-300 font-semibold">
              Store Persistent Fact or Preference
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono-tech text-gray-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-gray-950 border border-cyan-900/50 rounded-lg px-2.5 py-1.5 text-xs font-mono-tech text-gray-200"
              >
                <option value="preference">User Preference</option>
                <option value="fact">System Fact</option>
                <option value="contact">Contact Information</option>
                <option value="instruction">Special Instruction</option>
                <option value="custom_command">Custom Command</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono-tech text-gray-400 mb-1">Key Identifier</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. favorite_music_genre, home_address"
                className="w-full bg-gray-950 border border-cyan-900/50 rounded-lg px-2.5 py-1.5 text-xs font-mono-tech text-gray-200 focus:outline-none focus:border-cyan-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono-tech text-gray-400 mb-1">Memory Content</label>
            <input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="e.g. User prefers AC/DC classic rock and orchestral film scores."
              className="w-full bg-gray-950 border border-cyan-900/50 rounded-lg px-2.5 py-1.5 text-xs font-sans text-gray-200 focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-mono-tech text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-hud text-xs uppercase font-semibold"
            >
              Store Memory
            </button>
          </div>
        </form>
      )}

      {/* Memory Entries List */}
      <div className="space-y-3">
        {memories.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-2xl border border-cyan-900/30">
            <Database className="w-8 h-8 mx-auto text-cyan-400/50 mb-2" />
            <h4 className="font-hud text-sm uppercase text-gray-300">Memory Core Empty</h4>
            <p className="text-xs font-mono-tech text-gray-500 mt-1">
              Say "JARVIS, remember that..." to teach JARVIS facts about yourself.
            </p>
          </div>
        ) : (
          memories.map((mem) => (
            <div
              key={mem.id}
              className="glass-panel p-3.5 rounded-xl border border-cyan-900/40 hover:border-cyan-500/40 transition-all flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded border ${getCategoryColor(
                      mem.category
                    )}`}
                  >
                    {mem.category}
                  </span>
                  <span className="font-hud text-xs font-bold text-cyan-200 tracking-wide">
                    {mem.key}
                  </span>
                </div>
                <p className="text-xs font-sans text-gray-300 leading-relaxed">
                  {mem.value}
                </p>
                <div className="text-[10px] font-mono-tech text-gray-500">
                  Recorded: {new Date(mem.timestamp).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => handleDelete(mem.id)}
                className="p-1.5 text-gray-500 hover:text-rose-400 rounded hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Forget this memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
