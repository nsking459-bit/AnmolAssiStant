import React, { useEffect, useState } from 'react';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Square, 
  Volume2, 
  VolumeX, 
  Activity, 
  Zap, 
  ShieldCheck, 
  Radio,
  Sparkles,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { JarvisStatus, VoiceName } from '../types/jarvis';
import { ArcReactorVisualizer } from './ArcReactorVisualizer';

interface CallingModeViewProps {
  status: JarvisStatus;
  inputAudioLevel: number;
  outputAudioLevel: number;
  isMicMuted: boolean;
  onToggleMute: () => void;
  onStop: () => void;
  onEndCall: () => void;
  voiceName: VoiceName;
  liveModel: string;
  transcriptHistory: Array<{ speaker: 'user' | 'jarvis'; text: string; timestamp: number }>;
  onSendVoicePrompt: (prompt: string) => void;
}

export const CallingModeView: React.FC<CallingModeViewProps> = ({
  status,
  inputAudioLevel,
  outputAudioLevel,
  isMicMuted,
  onToggleMute,
  onStop,
  onEndCall,
  voiceName,
  liveModel,
  transcriptHistory,
  onSendVoicePrompt,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getActiveAudioLevel = () => {
    if (status === 'SPEAKING') return outputAudioLevel;
    if (status === 'LISTENING') return inputAudioLevel;
    return 0.05;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col justify-between overflow-hidden hud-grid">
      {/* Background Animated Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none hud-scanline" />

      {/* Top HUD Telemetry Bar */}
      <div className="relative z-10 w-full glass-panel px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping opacity-75" />
          <div>
            <h2 className="font-hud font-bold text-base sm:text-lg tracking-widest text-cyan-200 uppercase flex items-center gap-2">
              <span>CALLING MODE // LIVE VOICE</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono-tech border border-cyan-500/40 text-cyan-300 bg-cyan-950/60">
                {liveModel}
              </span>
            </h2>
            <p className="text-xs font-mono-tech text-gray-400 flex items-center gap-2">
              <span>Voice Core: <span className="text-cyan-400">{voiceName}</span></span>
              <span>•</span>
              <span>Session: <span className="text-emerald-400">{formatDuration(elapsedSeconds)}</span></span>
            </p>
          </div>
        </div>

        {/* Status Indicators Pill Group */}
        <div className="flex items-center gap-2 text-xs font-mono-tech">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-gray-900/80 border border-cyan-500/30">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-300">WEBSOCKET ONLINE</span>
          </div>

          <div
            className={`px-3 py-1 rounded border font-semibold uppercase flex items-center gap-1.5 ${
              status === 'SPEAKING'
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : status === 'LISTENING'
                ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : status === 'THINKING'
                ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : status === 'INTERRUPTED'
                ? 'bg-rose-950/70 border-rose-500 text-rose-300'
                : 'bg-gray-900/80 border-gray-700 text-gray-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{status}</span>
          </div>
        </div>
      </div>

      {/* Main Center Area: Large Arc Reactor & Reactive Waveform */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        {/* Continuous Voice Loop Banner */}
        <div className="mb-4 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono-tech tracking-wider uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>LISTEN → DETECT END OF SPEECH → THINK → SPEAK → LISTEN</span>
        </div>

        {/* Central Arc Reactor with dynamic sound reaction */}
        <div className="my-3">
          <ArcReactorVisualizer
            size="lg"
            status={status}
            audioLevel={getActiveAudioLevel()}
            onClick={status === 'SPEAKING' ? onStop : undefined}
          />
        </div>

        {/* Audio Spectrum Bars */}
        <div className="flex items-center justify-center gap-1.5 h-8 my-4">
          {Array.from({ length: 24 }).map((_, i) => {
            const height = Math.max(
              4,
              Math.min(
                32,
                Math.sin(i * 0.4 + elapsedSeconds * 2) * 10 +
                  getActiveAudioLevel() * 40 * ((i % 4) + 1) * 0.25
              )
            );
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  status === 'SPEAKING'
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                    : status === 'LISTENING'
                    ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]'
                    : 'bg-cyan-900/50'
                }`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* Interruption / Barge-in instruction pill */}
        <p className="text-xs font-mono-tech text-gray-400 text-center max-w-md">
          {status === 'SPEAKING' ? (
            <span className="text-emerald-300 font-semibold animate-pulse">
              JARVIS speaking • Say <span className="text-rose-400 font-bold">"JARVIS, stop"</span> or speak to interrupt
            </span>
          ) : status === 'LISTENING' ? (
            <span className="text-cyan-300">
              Speak naturally • No button presses needed • Microphones hot
            </span>
          ) : status === 'THINKING' ? (
            <span className="text-amber-300">
              Synthesizing command reasoning with Gemini...
            </span>
          ) : (
            <span>Hands-free voice bridge ready</span>
          )}
        </p>

        {/* Quick Voice Commands (for noisy environments or immediate test) */}
        <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-lg">
          {[
            "What's my status today?",
            "Open YouTube",
            "Remember a note: Mark 85 armor fully charged",
            "Who are you?",
            "JARVIS, stop",
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (prompt === 'JARVIS, stop') {
                  onStop();
                } else {
                  onSendVoicePrompt(prompt);
                }
              }}
              className="px-2.5 py-1 rounded bg-gray-900/70 hover:bg-cyan-950/80 text-gray-300 hover:text-cyan-300 border border-cyan-900/40 text-[11px] font-mono-tech transition-colors cursor-pointer"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Floating Conversation Transcript & Controls Bar */}
      <div className="relative z-10 w-full glass-panel border-t border-cyan-500/20 p-4">
        {/* Latest transcript preview */}
        <div className="max-w-2xl mx-auto mb-4 bg-gray-950/80 border border-cyan-900/40 rounded-lg p-2.5 max-h-24 overflow-y-auto text-xs font-mono-tech">
          {transcriptHistory.length === 0 ? (
            <div className="text-gray-500 italic text-center py-1">
              Voice transcripts will appear here in real-time as you speak...
            </div>
          ) : (
            transcriptHistory.slice(-2).map((item, idx) => (
              <div
                key={idx}
                className={`py-0.5 flex gap-2 ${
                  item.speaker === 'user' ? 'text-cyan-300' : 'text-emerald-300'
                }`}
              >
                <span className="font-bold uppercase tracking-wider text-[10px] opacity-75">
                  [{item.speaker}]:
                </span>
                <span>{item.text}</span>
              </div>
            ))
          )}
        </div>

        {/* Bottom Control Buttons */}
        <div className="max-w-md mx-auto flex items-center justify-center gap-4">
          {/* Mute/Unmute Mic */}
          <button
            onClick={onToggleMute}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border transition-all cursor-pointer ${
              isMicMuted
                ? 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-gray-900/80 border-cyan-500/40 text-cyan-400 hover:border-cyan-400'
            }`}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[9px] font-mono-tech mt-0.5 uppercase">
              {isMicMuted ? 'Muted' : 'Mic On'}
            </span>
          </button>

          {/* Instant Stop / Barge-in Action Button */}
          <button
            onClick={onStop}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-amber-950/80 hover:bg-amber-900 border-2 border-amber-500 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer active:scale-95"
            title="JARVIS, Stop! (Instant Barge-in)"
          >
            <Square className="w-6 h-6 fill-amber-300" />
            <span className="text-[10px] font-hud font-bold tracking-wider mt-0.5 uppercase">
              STOP
            </span>
          </button>

          {/* End Calling Mode Button */}
          <button
            onClick={onEndCall}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-red-950/90 hover:bg-red-900 border-2 border-red-500 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all cursor-pointer active:scale-95"
            title="End Calling Mode"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-[9px] font-mono-tech mt-0.5 uppercase">
              End Call
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
