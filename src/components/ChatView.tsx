import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Cpu, 
  User, 
  Sparkles, 
  Wrench, 
  CornerDownLeft,
  Square
} from 'lucide-react';
import { ChatMessage, JarvisStatus } from '../types/jarvis';
import { ArcReactorVisualizer } from './ArcReactorVisualizer';

interface ChatViewProps {
  messages: ChatMessage[];
  status: JarvisStatus;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onPlayResponseAudio: (text: string) => void;
  onStopAudio: () => void;
  isPlayingAudio: boolean;
  activePlayingId: string | null;
  onOpenCallingMode: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  status,
  onSendMessage,
  onClearChat,
  onPlayResponseAudio,
  onStopAudio,
  isPlayingAudio,
  activePlayingId,
  onOpenCallingMode,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || status === 'THINKING') return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    "What's my status and system diagnostics?",
    "Open YouTube and search for quantum computing",
    "Remember note: Stark Tower security code 4492",
    "Open Google Maps for nearby coffee",
    "Who are you and what are your capabilities?",
  ];

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto px-3 sm:px-4 py-4">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-900/30 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-hud text-sm font-semibold tracking-wider text-cyan-300 uppercase">
            Command Terminal
          </span>
          <span className="text-xs font-mono-tech text-gray-500">
            ({messages.length} exchanges)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearChat}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-tech text-gray-400 hover:text-rose-400 hover:bg-rose-950/30 rounded border border-gray-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[360px] text-center p-6 glass-panel rounded-2xl border border-cyan-500/20 my-auto">
            <div className="mb-4">
              <ArcReactorVisualizer status={status} size="md" onClick={onOpenCallingMode} />
            </div>
            <h3 className="font-hud font-bold text-lg text-cyan-200 uppercase tracking-widest mb-1">
              J.A.R.V.I.S. Online
            </h3>
            <p className="text-sm font-mono-tech text-gray-400 max-w-md mb-6">
              Full-featured Android AI assistant with Gemini intelligence. Ready to automate apps, manage notes, recall memory, or speak via real-time Live calling mode.
            </p>

            {/* Quick Prompt Starters */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(prompt)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 hover:border-cyan-500/50 text-xs font-mono-tech transition-all cursor-pointer text-left"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role !== 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  <Cpu className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-950/80 to-cyan-950/80 border border-cyan-500/30 text-cyan-50 rounded-tr-none'
                    : 'glass-panel text-gray-200 rounded-tl-none border border-cyan-900/40'
                }`}
              >
                {/* Header label & action buttons */}
                <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-white/5 text-[11px] font-mono-tech text-gray-400">
                  <span className="font-semibold text-cyan-400 uppercase tracking-wider">
                    {msg.role === 'user' ? 'You' : 'JARVIS'}
                  </span>

                  <div className="flex items-center gap-2">
                    {msg.role === 'model' && (
                      <button
                        onClick={() =>
                          isPlayingAudio && activePlayingId === msg.id
                            ? onStopAudio()
                            : onPlayResponseAudio(msg.content)
                        }
                        className="p-1 hover:text-cyan-300 text-gray-400 transition-colors cursor-pointer"
                        title={isPlayingAudio && activePlayingId === msg.id ? 'Stop Speech' : 'Play Voice'}
                      >
                        {isPlayingAudio && activePlayingId === msg.id ? (
                          <Square className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1 hover:text-cyan-300 text-gray-400 transition-colors cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {/* Render Tool Invocations if any */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-cyan-900/30 space-y-2">
                    {msg.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-cyan-950/50 border border-cyan-500/20 text-xs font-mono-tech"
                      >
                        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold mb-1">
                          <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Tool Executed: {tc.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-300 bg-gray-950/60 p-1.5 rounded overflow-x-auto">
                          {JSON.stringify(tc.args, null, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-950 border border-blue-500/40 flex items-center justify-center text-blue-300">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Thinking Indicator */}
        {status === 'THINKING' && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
              <Cpu className="w-4 h-4 animate-spin" />
            </div>
            <div className="glass-panel px-4 py-2.5 rounded-2xl rounded-tl-none border border-amber-500/30 text-xs font-mono-tech text-amber-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>JARVIS is calculating response with Gemini...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Area */}
      <form onSubmit={handleSubmit} className="mt-3 relative">
        <div className="flex items-center gap-2 p-1.5 glass-panel rounded-xl border border-cyan-500/30 focus-within:border-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Command JARVIS (e.g. 'Open YouTube', 'Remember a note', 'Check system diagnostics')..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none font-sans"
            disabled={status === 'THINKING'}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || status === 'THINKING'}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-hud text-xs font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
