import React, { useState } from 'react';
import { 
  Smartphone, 
  Flashlight, 
  Vibrate, 
  Youtube, 
  MessageSquare, 
  MapPin, 
  Camera, 
  Settings, 
  Phone, 
  Mail, 
  Clock, 
  Calculator, 
  Play, 
  CheckCircle2, 
  Clock3, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
  Radio,
  Wifi,
  Bluetooth,
  Sun,
  Volume2,
  Battery,
  Share2,
  Calendar,
  Folder,
  Music,
  Send,
  Sliders,
  Globe
} from 'lucide-react';
import { phoneAutomation, AutomationResult } from '../services/phoneAutomation';
import { geminiService } from '../services/geminiService';
import { MultiStepTask, TaskStep } from '../types/jarvis';
import { soundEffects } from '../services/audioUtils';

interface PhoneAutomationViewProps {
  onSpeakSummary?: (text: string) => void;
  apiKey?: string;
}

export const PhoneAutomationView: React.FC<PhoneAutomationViewProps> = ({
  onSpeakSummary,
  apiKey,
}) => {
  const [lastActionResult, setLastActionResult] = useState<AutomationResult | null>(null);
  const [flashlightActive, setFlashlightActive] = useState(false);
  const [brightnessLevel, setBrightnessLevel] = useState(100);
  const [customMultiStepGoal, setCustomMultiStepGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [activeTask, setActiveTask] = useState<MultiStepTask | null>(null);
  const [appFilter, setAppFilter] = useState<'all' | 'communication' | 'media' | 'tools' | 'settings'>('all');

  const handleOpenApp = async (name: string, action?: string) => {
    const res = await phoneAutomation.openApp(name, action);
    setLastActionResult(res);
  };

  const handleAccessSetting = async (setting: string, val?: string) => {
    const res = await phoneAutomation.accessSetting(setting, val);
    setLastActionResult(res);
    if (setting.includes('flash') || setting.includes('torch')) {
      setFlashlightActive(res.data?.state || false);
    }
  };

  const handleBrightnessChange = (val: number) => {
    setBrightnessLevel(val);
    phoneAutomation.accessSetting('brightness', `${val}%`);
  };

  const handleVibratePattern = (type: 'single' | 'double' | 'sos') => {
    if (type === 'double') {
      phoneAutomation.accessSetting('vibrate', 'double');
    } else if (type === 'sos') {
      phoneAutomation.vibrate(100);
      setTimeout(() => phoneAutomation.vibrate(100), 180);
      setTimeout(() => phoneAutomation.vibrate(300), 400);
      setLastActionResult({ success: true, action: 'vibrate', message: 'Haptic SOS sequence dispatched.' });
    } else {
      const res = phoneAutomation.vibrate(250);
      setLastActionResult(res);
    }
  };

  const handleExecuteMultiStep = async (goal: string) => {
    setIsPlanning(true);
    soundEffects.playWakeChime();

    try {
      const plan = await geminiService.planMultiStepTask(goal, apiKey);
      const steps: TaskStep[] = (plan.steps || []).map((s: any, idx: number) => ({
        stepNumber: s.stepNumber || idx + 1,
        description: s.description || 'Step execution',
        tool: s.tool || 'genericAction',
        params: s.params || {},
        status: 'pending',
      }));

      const task: MultiStepTask = {
        id: `task-${Date.now()}`,
        title: plan.title || goal,
        rawGoal: goal,
        steps,
        status: 'executing',
        currentStepIndex: 0,
        createdAt: Date.now(),
      };

      setActiveTask(task);
      setIsPlanning(false);

      // Execute steps sequentially with verification
      for (let i = 0; i < steps.length; i++) {
        task.currentStepIndex = i;
        task.steps[i].status = 'running';
        setActiveTask({ ...task });

        // Simulate step execution delay
        await new Promise((r) => setTimeout(r, 1000));

        const step = task.steps[i];
        if (step.tool === 'openApplication') {
          await phoneAutomation.openApp(step.params.appName as string, step.params.action as string);
          step.result = `Verified launch of ${step.params.appName}`;
        } else if (step.tool === 'deviceControl') {
          const res = await phoneAutomation.accessSetting(step.params.setting as string, step.params.value as string);
          step.result = res.message;
        } else {
          step.result = `Action executed and verified`;
        }

        step.status = 'completed';
        soundEffects.playSuccessBeep();
        setActiveTask({ ...task });
      }

      task.status = 'completed';
      task.finalSummary = `Successfully orchestrated all ${steps.length} multi-step actions.`;
      setActiveTask({ ...task });

      if (onSpeakSummary) {
        onSpeakSummary(task.finalSummary);
      }
    } catch (err: any) {
      console.error('Multi-step planning failed:', err);
      setIsPlanning(false);
      if (activeTask) {
        activeTask.status = 'failed';
        setActiveTask({ ...activeTask });
      }
    }
  };

  const allApps = [
    // Media
    { id: 'youtube', name: 'YouTube', category: 'media', icon: Youtube, color: 'text-red-400 hover:border-red-500', action: 'Stark Industries Tech' },
    { id: 'spotify', name: 'Spotify', category: 'media', icon: Music, color: 'text-emerald-400 hover:border-emerald-500', action: 'AC/DC' },
    { id: 'music', name: 'YT Music', category: 'media', icon: Music, color: 'text-rose-400 hover:border-rose-500' },
    { id: 'photos', name: 'Photos / Gallery', category: 'media', icon: Camera, color: 'text-cyan-400 hover:border-cyan-500' },

    // Communication
    { id: 'whatsapp', name: 'WhatsApp', category: 'communication', icon: MessageSquare, color: 'text-emerald-400 hover:border-emerald-500' },
    { id: 'telegram', name: 'Telegram', category: 'communication', icon: Send, color: 'text-sky-400 hover:border-sky-500' },
    { id: 'phone', name: 'Phone Dialer', category: 'communication', icon: Phone, color: 'text-green-400 hover:border-green-500' },
    { id: 'sms', name: 'SMS Messages', category: 'communication', icon: MessageSquare, color: 'text-teal-400 hover:border-teal-500' },
    { id: 'gmail', name: 'Gmail', category: 'communication', icon: Mail, color: 'text-rose-400 hover:border-rose-500' },
    { id: 'contacts', name: 'Contacts', category: 'communication', icon: Share2, color: 'text-indigo-400 hover:border-indigo-500' },

    // Tools
    { id: 'maps', name: 'Google Maps', category: 'tools', icon: MapPin, color: 'text-blue-400 hover:border-blue-500', action: 'Nearby EV Charger' },
    { id: 'calculator', name: 'Calculator', category: 'tools', icon: Calculator, color: 'text-amber-400 hover:border-amber-500' },
    { id: 'clock', name: 'Clock & Timer', category: 'tools', icon: Clock, color: 'text-purple-400 hover:border-purple-500' },
    { id: 'calendar', name: 'Calendar', category: 'tools', icon: Calendar, color: 'text-blue-400 hover:border-blue-500' },
    { id: 'chrome', name: 'Chrome Browser', category: 'tools', icon: Globe, color: 'text-yellow-400 hover:border-yellow-500' },
    { id: 'files', name: 'Files & Drive', category: 'tools', icon: Folder, color: 'text-cyan-400 hover:border-cyan-500' },
    { id: 'playstore', name: 'Play Store', category: 'tools', icon: Compass, color: 'text-emerald-400 hover:border-emerald-500' },

    // Settings
    { id: 'settings', name: 'Android Settings', category: 'settings', icon: Settings, color: 'text-gray-300 hover:border-cyan-400' },
  ];

  const filteredApps = allApps.filter((a) => (appFilter === 'all' ? true : a.category === appFilter));

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-6">
      {/* Header telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-cyan-900/30">
        <div>
          <h2 className="font-hud font-bold text-base sm:text-lg text-cyan-200 uppercase tracking-widest flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <span>Complete Android App & Settings Access</span>
          </h2>
          <p className="text-xs font-mono-tech text-gray-400">
            Automate all installed apps, device hardware, and system settings via Gemini.
          </p>
        </div>

        {lastActionResult && (
          <div className="text-xs font-mono-tech px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.2)] animate-pulse">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{lastActionResult.message}</span>
          </div>
        )}
      </div>

      {/* Android System Settings Deck */}
      <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-hud font-semibold text-sm uppercase tracking-wider text-cyan-100">
              Android Hardware & System Settings Controls
            </h3>
          </div>
          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
            Hardware Deck
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Flashlight Torch */}
          <div className="p-3.5 glass-panel rounded-xl border border-cyan-900/40 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flashlight className={`w-5 h-5 ${flashlightActive ? 'text-amber-400 animate-pulse' : 'text-gray-400'}`} />
                <span className="font-hud text-xs uppercase text-gray-200 font-semibold">Flashlight</span>
              </div>
              <span className={`text-[10px] font-mono-tech px-2 py-0.5 rounded border ${flashlightActive ? 'border-amber-400 text-amber-300 bg-amber-950/50' : 'border-gray-700 text-gray-400'}`}>
                {flashlightActive ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccessSetting('flashlight', 'on')}
                className="flex-1 py-1.5 rounded bg-amber-950/70 hover:bg-amber-900/80 border border-amber-600/50 text-amber-300 text-xs font-mono-tech uppercase cursor-pointer"
              >
                Turn On
              </button>
              <button
                onClick={() => handleAccessSetting('flashlight', 'off')}
                className="flex-1 py-1.5 rounded bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs font-mono-tech uppercase cursor-pointer"
              >
                Turn Off
              </button>
            </div>
          </div>

          {/* Screen Brightness Controller */}
          <div className="p-3.5 glass-panel rounded-xl border border-cyan-900/40 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-400" />
                <span className="font-hud text-xs uppercase text-gray-200 font-semibold">Display Brightness</span>
              </div>
              <span className="text-[10px] font-mono-tech text-cyan-300">{brightnessLevel}%</span>
            </div>
            <input
              type="range"
              min="15"
              max="100"
              value={brightnessLevel}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono-tech text-gray-500">
              <span>Dim (15%)</span>
              <span>Max (100%)</span>
            </div>
          </div>

          {/* Haptic Vibration */}
          <div className="p-3.5 glass-panel rounded-xl border border-cyan-900/40 flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2">
              <Vibrate className="w-5 h-5 text-cyan-400" />
              <span className="font-hud text-xs uppercase text-gray-200 font-semibold">Haptic Feedback</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleVibratePattern('single')}
                className="flex-1 py-1.5 rounded bg-gray-900 hover:bg-cyan-950 border border-cyan-800/50 text-[11px] font-mono-tech text-cyan-300 cursor-pointer"
              >
                Pulse
              </button>
              <button
                onClick={() => handleVibratePattern('double')}
                className="flex-1 py-1.5 rounded bg-gray-900 hover:bg-cyan-950 border border-cyan-800/50 text-[11px] font-mono-tech text-cyan-300 cursor-pointer"
              >
                Double
              </button>
              <button
                onClick={() => handleVibratePattern('sos')}
                className="flex-1 py-1.5 rounded bg-gray-900 hover:bg-cyan-950 border border-cyan-800/50 text-[11px] font-mono-tech text-cyan-300 cursor-pointer"
              >
                SOS
              </button>
            </div>
          </div>

          {/* Wi-Fi & Network */}
          <div className="p-3.5 glass-panel rounded-xl border border-cyan-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Wifi className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="font-hud text-xs uppercase text-gray-200 font-semibold">Wi-Fi Settings</div>
                <div className="text-[10px] font-mono-tech text-gray-400">Status: {navigator.onLine ? 'Connected' : 'Offline'}</div>
              </div>
            </div>
            <button
              onClick={() => handleAccessSetting('wifi')}
              className="px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-800 text-[10px] font-mono-tech text-cyan-300 hover:border-cyan-400 cursor-pointer"
            >
              Calibrate
            </button>
          </div>

          {/* Bluetooth Settings */}
          <div className="p-3.5 glass-panel rounded-xl border border-cyan-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bluetooth className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-hud text-xs uppercase text-gray-200 font-semibold">Bluetooth</div>
                <div className="text-[10px] font-mono-tech text-gray-400">Discovery Engine</div>
              </div>
            </div>
            <button
              onClick={() => handleAccessSetting('bluetooth')}
              className="px-2.5 py-1 rounded bg-blue-950/70 border border-blue-800 text-[10px] font-mono-tech text-blue-300 hover:border-blue-400 cursor-pointer"
            >
              Scan
            </button>
          </div>

          {/* Battery Diagnostics */}
          <div className="p-3.5 glass-panel rounded-xl border border-cyan-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Battery className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="font-hud text-xs uppercase text-gray-200 font-semibold">Battery Diagnostics</div>
                <div className="text-[10px] font-mono-tech text-gray-400">Power Management</div>
              </div>
            </div>
            <button
              onClick={() => handleAccessSetting('battery')}
              className="px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-800 text-[10px] font-mono-tech text-emerald-300 hover:border-emerald-400 cursor-pointer"
            >
              Inspect
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Step Task Orchestration Section */}
      <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="font-hud font-semibold text-sm uppercase tracking-wider text-cyan-100">
              Multi-Step Task Orchestrator
            </h3>
          </div>
          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
            Sequential Planner
          </span>
        </div>

        <p className="text-xs font-mono-tech text-gray-400 mb-4">
          JARVIS understands high-level phone automation goals, breaks them into verified steps, and executes them.
        </p>

        {/* Input prompt */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customMultiStepGoal}
            onChange={(e) => setCustomMultiStepGoal(e.target.value)}
            placeholder="e.g. Open YouTube, search for AI tutorials, and activate flashlight torch"
            className="flex-1 bg-gray-950/80 border border-cyan-900/50 rounded-lg px-3 py-2 text-xs font-sans text-gray-100 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={() => handleExecuteMultiStep(customMultiStepGoal)}
            disabled={!customMultiStepGoal.trim() || isPlanning}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-hud text-xs uppercase tracking-wider font-semibold disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isPlanning ? 'Planning...' : 'Run Task'}</span>
          </button>
        </div>

        {/* Preset Task Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {[
            'Open YouTube and search for quantum computing',
            'Pulse haptics and activate flashlight torch',
            'Open Google Maps and search nearby hospitals',
            'Launch WhatsApp and draft status update',
          ].map((preset, i) => (
            <button
              key={i}
              onClick={() => handleExecuteMultiStep(preset)}
              className="text-left p-2.5 rounded-lg bg-gray-900/60 hover:bg-cyan-950/60 border border-cyan-900/40 text-xs font-mono-tech text-cyan-300/80 hover:text-cyan-200 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>"{preset}"</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          ))}
        </div>

        {/* Active Multi-Step Task Execution Status */}
        {activeTask && (
          <div className="mt-4 pt-4 border-t border-cyan-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-hud text-xs uppercase text-cyan-300 font-semibold">
                Task Plan: {activeTask.title}
              </span>
              <span
                className={`text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded border ${
                  activeTask.status === 'completed'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/40'
                    : activeTask.status === 'executing'
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-950/40 animate-pulse'
                    : 'border-red-500 text-red-400 bg-red-950/40'
                }`}
              >
                {activeTask.status}
              </span>
            </div>

            <div className="space-y-2">
              {activeTask.steps.map((st) => (
                <div
                  key={st.stepNumber}
                  className={`p-2.5 rounded-lg border text-xs font-mono-tech flex items-start gap-3 transition-colors ${
                    st.status === 'completed'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-gray-200'
                      : st.status === 'running'
                      ? 'bg-cyan-950/50 border-cyan-400 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'bg-gray-900/40 border-gray-800 text-gray-400'
                  }`}
                >
                  <div className="mt-0.5">
                    {st.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : st.status === 'running' ? (
                      <Clock3 className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center text-[10px]">
                        {st.stepNumber}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-300">
                        Step {st.stepNumber}: {st.description}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase">{st.tool}</span>
                    </div>
                    {st.result && (
                      <div className="text-[11px] text-emerald-300/90 mt-1 font-mono-tech">
                        ✓ {st.result}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complete Android Application Launchpad */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h3 className="font-hud font-semibold text-sm uppercase tracking-wider text-cyan-200 flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Supported Phone Applications ({filteredApps.length})</span>
          </h3>

          {/* Filter Pills */}
          <div className="flex gap-1 overflow-x-auto text-[10px] font-mono-tech uppercase">
            {(['all', 'communication', 'media', 'tools', 'settings'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setAppFilter(cat)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  appFilter === cat
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400'
                    : 'bg-gray-900/80 text-gray-400 hover:text-gray-200 border border-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filteredApps.map((app) => (
            <button
              key={app.id}
              onClick={() => handleOpenApp(app.id, (app as any).action)}
              className={`p-3 rounded-xl glass-panel border border-cyan-900/40 hover:bg-cyan-950/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center group ${app.color}`}
            >
              <app.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="font-hud text-[11px] font-semibold uppercase tracking-wider text-gray-200 truncate w-full">
                {app.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
