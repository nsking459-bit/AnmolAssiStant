import React from 'react';
import { 
  Cpu, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryCharging, 
  PhoneCall, 
  Settings as SettingsIcon, 
  Scan,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { JarvisStatus, PersonalityMode, DeviceTelemetry } from '../types/jarvis';

interface HudHeaderProps {
  status: JarvisStatus;
  personality: PersonalityMode;
  telemetry: DeviceTelemetry;
  wakeWordActive: boolean;
  onOpenCallingMode: () => void;
  onOpenSettings: () => void;
  onOpenScreenControl: () => void;
  activeTab: 'chat' | 'automation' | 'notes' | 'memory';
  onSelectTab: (tab: 'chat' | 'automation' | 'notes' | 'memory') => void;
}

export const HudHeader: React.FC<HudHeaderProps> = ({
  status,
  personality,
  telemetry,
  wakeWordActive,
  onOpenCallingMode,
  onOpenSettings,
  onOpenScreenControl,
  activeTab,
  onSelectTab,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'SPEAKING':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40 shadow-emerald-500/20';
      case 'LISTENING':
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40 shadow-cyan-500/20';
      case 'THINKING':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/40 shadow-amber-500/20';
      case 'INTERRUPTED':
        return 'text-rose-400 border-rose-500/40 bg-rose-950/40 shadow-rose-500/20';
      case 'CONNECTING':
        return 'text-indigo-400 border-indigo-500/40 bg-indigo-950/40';
      case 'ERROR':
        return 'text-red-400 border-red-500/40 bg-red-950/40';
      default:
        return 'text-cyan-300 border-cyan-800/40 bg-gray-900/60';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-cyan-900/30 px-3 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Status Pill */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-950/70 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]">
            <Cpu className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-hud font-bold text-lg sm:text-xl tracking-widest text-cyan-100 uppercase">
                J.A.R.V.I.S.
              </span>
              <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono-tech border border-cyan-500/30 text-cyan-300 bg-cyan-950/40">
                MK-85
              </span>
              <span className={`text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded-full border shadow-sm ${getStatusColor()}`}>
                {status}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono-tech flex items-center gap-2">
              <span className="capitalize text-cyan-400 font-semibold">{personality} Protocol</span>
              {wakeWordActive && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Wake Word Ready
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Telemetry Chips (Desktop / Tablet) */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono-tech text-gray-300">
          {/* Battery */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-900/60 border border-cyan-900/30">
            {telemetry.isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <Battery className="w-4 h-4 text-cyan-400" />
            )}
            <span>{telemetry.batteryLevel !== null ? `${telemetry.batteryLevel}%` : 'OPTIMAL'}</span>
          </div>

          {/* Network */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-900/60 border border-cyan-900/30">
            {telemetry.networkOnline ? (
              <Wifi className="w-4 h-4 text-cyan-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-400" />
            )}
            <span>{telemetry.networkOnline ? telemetry.connectionType : 'OFFLINE'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Calling Mode Button */}
          <button
            onClick={onOpenCallingMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-hud text-xs tracking-wider uppercase font-semibold shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer active:scale-95"
            title="Launch Full Real-time Live Calling Mode"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Mode</span>
          </button>

          {/* Screen Interaction / Reading Button */}
          <button
            onClick={onOpenScreenControl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-900/80 hover:bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-hud text-xs transition-all cursor-pointer"
            title="Android Screen Reader & Interaction"
          >
            <Scan className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Screen</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-gray-900/80 hover:bg-cyan-950/60 text-gray-300 hover:text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
            title="JARVIS Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto flex items-center gap-2 mt-2 pt-2 border-t border-cyan-900/20 text-xs font-hud uppercase tracking-wider overflow-x-auto">
        <button
          onClick={() => onSelectTab('chat')}
          className={`px-3 py-1 rounded transition-colors cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'text-gray-400 hover:text-cyan-200'
          }`}
        >
          Terminal Chat
        </button>
        <button
          onClick={() => onSelectTab('automation')}
          className={`px-3 py-1 rounded transition-colors cursor-pointer ${
            activeTab === 'automation'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'text-gray-400 hover:text-cyan-200'
          }`}
        >
          Phone Automation
        </button>
        <button
          onClick={() => onSelectTab('notes')}
          className={`px-3 py-1 rounded transition-colors cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'text-gray-400 hover:text-cyan-200'
          }`}
        >
          Notes Vault
        </button>
        <button
          onClick={() => onSelectTab('memory')}
          className={`px-3 py-1 rounded transition-colors cursor-pointer ${
            activeTab === 'memory'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'text-gray-400 hover:text-cyan-200'
          }`}
        >
          Memory Core
        </button>
      </div>
    </header>
  );
};
