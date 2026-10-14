import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Cpu, 
  Mic, 
  Volume2, 
  User, 
  Database, 
  ShieldCheck, 
  Check, 
  Trash2, 
  RefreshCw, 
  AlertCircle,
  Eye,
  EyeOff,
  Sliders,
  Sparkles
} from 'lucide-react';
import { AppSettings, AndroidPermissionState, VoiceName, PersonalityMode } from '../types/jarvis';
import { geminiService } from '../services/geminiService';
import { soundEffects } from '../services/audioUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  permissions: AndroidPermissionState[];
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onSaveApiKey: (key: string) => void;
  onDeleteApiKey: () => void;
  onTogglePermission: (id: string) => void;
  onClearMemory: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  permissions,
  onUpdateSettings,
  onSaveApiKey,
  onDeleteApiKey,
  onTogglePermission,
  onClearMemory,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'voice' | 'wakeword' | 'personality' | 'memory' | 'permissions'>('ai');
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await geminiService.testKey(inputKey || undefined);
      setTestResult({ success: true, message: `${res.message} (${res.keySource})` });
      soundEffects.playSuccessBeep();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Key test failed.' });
      soundEffects.playInterruptChime();
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveKey = () => {
    if (!inputKey.trim()) return;
    onSaveApiKey(inputKey.trim());
    setInputKey('');
    soundEffects.playSuccessBeep();
    setTestResult({ success: true, message: 'API key saved securely for this session.' });
  };

  const voices: VoiceName[] = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-hud font-bold text-base uppercase tracking-widest text-cyan-200">
                JARVIS System Preferences
              </h3>
              <p className="text-xs font-mono-tech text-gray-400">
                Configure AI Brain, Voice synthesis, Wake words, and Android permissions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-cyan-900/30 px-4 bg-gray-950/60 overflow-x-auto text-xs font-hud uppercase tracking-wider">
          {[
            { id: 'ai', label: 'AI Brain', icon: Cpu },
            { id: 'voice', label: 'Voice & Live', icon: Volume2 },
            { id: 'wakeword', label: 'Wake Word', icon: Mic },
            { id: 'personality', label: 'Personality', icon: User },
            { id: 'memory', label: 'Memory', icon: Database },
            { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs font-sans">
          {/* TAB 1: AI BRAIN & API KEY */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-hud text-sm font-semibold text-cyan-200 uppercase tracking-wider mb-1">
                  Google Gemini API Configuration
                </h4>
                <p className="text-gray-400 font-mono-tech leading-relaxed">
                  JARVIS connects directly to Google Gemini for real-time Live voice streaming, multi-step planning, and tool orchestration. The server automatically uses the attached environment key or your custom key override below.
                </p>
              </div>

              {/* API Key Input Field */}
              <div className="glass-panel p-4 rounded-xl border border-cyan-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-hud uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-cyan-400" />
                    <span>Gemini API Key</span>
                  </label>
                  <span className="text-[10px] font-mono-tech text-gray-400">
                    {settings.hasCustomKey ? 'Custom Key Stored' : 'Server Environment Key Active'}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder={settings.hasCustomKey ? '••••••••••••••••••••••••' : 'Enter Gemini API Key to override (optional)'}
                    className="w-full bg-gray-950 border border-cyan-900/60 rounded-lg px-3 py-2 pr-10 text-xs font-mono-tech text-gray-200 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Key action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleSaveKey}
                    disabled={!inputKey.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-hud uppercase tracking-wider font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Save Key
                  </button>

                  <button
                    onClick={handleTestKey}
                    disabled={testingKey}
                    className="px-3.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-cyan-300 border border-cyan-800 font-hud uppercase tracking-wider font-semibold disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingKey ? 'animate-spin' : ''}`} />
                    <span>Test Key</span>
                  </button>

                  {settings.hasCustomKey && (
                    <button
                      onClick={onDeleteApiKey}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 font-hud uppercase tracking-wider font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Key</span>
                    </button>
                  )}
                </div>

                {testResult && (
                  <div
                    className={`p-2.5 rounded-lg border flex items-center gap-2 font-mono-tech text-[11px] ${
                      testResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Model Configurations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-mono-tech text-gray-400 mb-1">
                    Gemini Live Voice Model
                  </label>
                  <select
                    value={settings.liveModel}
                    onChange={(e) => onUpdateSettings({ liveModel: e.target.value })}
                    className="w-full bg-gray-950 border border-cyan-900/60 rounded-lg px-2.5 py-2 font-mono-tech text-cyan-200"
                  >
                    <option value="gemini-3.8-live">gemini-3.8-live (Native Audio)</option>
                    <option value="gemini-3.8-live-extended-thinking">gemini-3.8-live-extended-thinking</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono-tech text-gray-400 mb-1">
                    Text Reasoning Model
                  </label>
                  <select
                    value={settings.chatModel}
                    onChange={(e) => onUpdateSettings({ chatModel: e.target.value })}
                    className="w-full bg-gray-950 border border-cyan-900/60 rounded-lg px-2.5 py-2 font-mono-tech text-cyan-200"
                  >
                    <option value="gemini-3-flash-preview">gemini-3-flash-preview (Ultra-Fast & Full Quota - Recommended)</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Deep Reasoning)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Flash Lite)</option>
                    <option value="gemini-3.8-flash">gemini-3.8-flash (Standard Flash)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VOICE & LIVE SETTINGS */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-hud text-sm font-semibold text-cyan-200 uppercase tracking-wider mb-1">
                  Gemini Live Voice Configuration
                </h4>
                <p className="text-gray-400 font-mono-tech">
                  Select the native prebuilt Gemini Live voice persona and acoustic parameters.
                </p>
              </div>

              {/* Voice Selector */}
              <div>
                <label className="block font-mono-tech text-gray-400 mb-2">Voice Persona</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {voices.map((v) => (
                    <button
                      key={v}
                      onClick={() => onUpdateSettings({ voiceName: v })}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        settings.voiceName === v
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'glass-panel border-cyan-900/40 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="font-hud font-bold text-sm tracking-wider uppercase">{v}</div>
                      <div className="text-[10px] font-mono-tech text-cyan-400/80 mt-0.5">
                        {v === 'Zephyr' ? 'British Butler / Crisp' : v === 'Puck' ? 'Dynamic & Energetic' : 'Clear & Articulate'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto speak responses */}
              <div className="flex items-center justify-between p-3.5 glass-panel rounded-xl border border-cyan-900/40">
                <div>
                  <div className="font-hud text-xs uppercase tracking-wider text-gray-200 font-semibold">
                    Auto-Speak Text Responses
                  </div>
                  <div className="text-[11px] font-mono-tech text-gray-400">
                    Automatically speak assistant replies via Gemini Flash Lite TTS
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSpeakResponses}
                  onChange={(e) => onUpdateSettings({ autoSpeakResponses: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Continuous listening */}
              <div className="flex items-center justify-between p-3.5 glass-panel rounded-xl border border-cyan-900/40">
                <div>
                  <div className="font-hud text-xs uppercase tracking-wider text-gray-200 font-semibold">
                    Continuous Hands-Free Listening Loop
                  </div>
                  <div className="text-[11px] font-mono-tech text-gray-400">
                    Automatically listen again as soon as JARVIS finishes speaking
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.continuousListening}
                  onChange={(e) => onUpdateSettings({ continuousListening: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: WAKE WORD */}
          {activeTab === 'wakeword' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-hud text-sm font-semibold text-cyan-200 uppercase tracking-wider mb-1">
                  Wake Word Activation Engine
                </h4>
                <p className="text-gray-400 font-mono-tech">
                  Activates hands-free voice without tapping buttons. Say "JARVIS" or "Hey JARVIS".
                </p>
              </div>

              {/* Wake Word Enable Toggle */}
              <div className="flex items-center justify-between p-3.5 glass-panel rounded-xl border border-cyan-900/40">
                <div>
                  <div className="font-hud text-xs uppercase tracking-wider text-gray-200 font-semibold">
                    Wake Word Detection
                  </div>
                  <div className="text-[11px] font-mono-tech text-gray-400">
                    Continuous acoustic listener for assistant activation
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.wakeWordEnabled}
                  onChange={(e) => onUpdateSettings({ wakeWordEnabled: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Wake Phrase Selection */}
              <div>
                <label className="block font-mono-tech text-gray-400 mb-2">Activation Phrase</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['JARVIS', 'Hey JARVIS'] as const).map((phrase) => (
                    <button
                      key={phrase}
                      onClick={() => onUpdateSettings({ wakeWordPhrase: phrase })}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        settings.wakeWordPhrase === phrase
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'glass-panel border-cyan-900/40 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="font-hud font-bold text-sm tracking-wider uppercase">
                        "{phrase}"
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sensitivity Slider */}
              <div className="p-3.5 glass-panel rounded-xl border border-cyan-900/40 space-y-2">
                <div className="flex justify-between items-center font-mono-tech">
                  <span className="text-gray-300">Detection Sensitivity:</span>
                  <span className="text-cyan-400 font-semibold">
                    {Math.round(settings.wakeWordSensitivity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.wakeWordSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ wakeWordSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono-tech text-gray-500">
                  <span>Low (Quiet Environments)</span>
                  <span>High (Noisy Ambient)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PERSONALITY */}
          {activeTab === 'personality' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-hud text-sm font-semibold text-cyan-200 uppercase tracking-wider mb-1">
                  JARVIS Personality Matrix
                </h4>
                <p className="text-gray-400 font-mono-tech">
                  Manually adjust response tone, formality, and behavioral protocol.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'normal',
                    title: 'Normal (Stark)',
                    desc: 'Polite British wit, razor-sharp technical acumen, loyal Stark Industries protocol.',
                  },
                  {
                    id: 'serious',
                    title: 'Serious (Tactical)',
                    desc: 'Mission-critical, terse military brevity, zero conversational filler, pure verification.',
                  },
                  {
                    id: 'companion',
                    title: 'Companion',
                    desc: 'Warm, empathetic, supportive, conversational, and encouraging tone.',
                  },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => onUpdateSettings({ personality: mode.id as any })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      settings.personality === mode.id
                        ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'glass-panel border-cyan-900/40 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div>
                      <div className="font-hud font-bold text-sm tracking-wide uppercase mb-1">
                        {mode.title}
                      </div>
                      <div className="text-[11px] font-sans leading-relaxed text-gray-300">
                        {mode.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Formality Selector */}
              <div>
                <label className="block font-mono-tech text-gray-400 mb-1">Formality Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['casual', 'balanced', 'formal'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => onUpdateSettings({ formality: lvl })}
                      className={`py-2 rounded-lg border font-mono-tech uppercase text-xs capitalize cursor-pointer ${
                        settings.formality === lvl
                          ? 'border-cyan-400 text-cyan-300 bg-cyan-950'
                          : 'border-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-hud text-sm font-semibold text-cyan-200 uppercase tracking-wider mb-1">
                  Long-Term Memory Controls
                </h4>
                <p className="text-gray-400 font-mono-tech">
                  Manage persistent memory retention across sessions.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 glass-panel rounded-xl border border-cyan-900/40">
                <div>
                  <div className="font-hud text-xs uppercase tracking-wider text-gray-200 font-semibold">
                    Persistent Memory Core
                  </div>
                  <div className="text-[11px] font-mono-tech text-gray-400">
                    Allow JARVIS to retain user preferences and past instructions
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.memoryEnabled}
                  onChange={(e) => onUpdateSettings({ memoryEnabled: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="p-4 glass-panel rounded-xl border border-red-900/30 flex items-center justify-between">
                <div>
                  <div className="font-hud text-xs uppercase text-red-300 font-semibold">
                    Wipe Memory Core
                  </div>
                  <div className="text-[11px] font-mono-tech text-gray-400">
                    Erase all stored user preferences, facts, and custom commands
                  </div>
                </div>
                <button
                  onClick={onClearMemory}
                  className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700 font-hud text-xs uppercase font-semibold cursor-pointer"
                >
                  Clear Memory
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: ANDROID PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-hud text-sm font-semibold text-cyan-200 uppercase tracking-wider mb-1">
                  Android Permission Management
                </h4>
                <p className="text-gray-400 font-mono-tech">
                  Only required permissions are requested. Disable any service at any time.
                </p>
              </div>

              <div className="space-y-2.5">
                {permissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="p-3 glass-panel rounded-xl border border-cyan-900/40 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-hud font-bold text-xs text-cyan-200 uppercase">
                          {perm.name}
                        </span>
                        {perm.required && (
                          <span className="text-[9px] font-mono-tech px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono-tech text-gray-400 mt-0.5">
                        {perm.description}
                      </p>
                    </div>

                    <button
                      onClick={() => onTogglePermission(perm.id)}
                      className={`px-3 py-1 rounded text-xs font-mono-tech uppercase font-semibold border transition-all cursor-pointer ${
                        perm.granted
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                          : 'bg-gray-900 border-gray-700 text-gray-500'
                      }`}
                    >
                      {perm.granted ? 'Granted' : 'Revoked'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
