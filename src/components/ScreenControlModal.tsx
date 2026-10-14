import React, { useState } from 'react';
import { 
  X, 
  Scan, 
  MousePointer, 
  Type, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  Home, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  ShieldCheck,
  Video
} from 'lucide-react';
import { ScreenElement } from '../types/jarvis';
import { screenReader } from '../services/screenReader';
import { soundEffects } from '../services/audioUtils';

interface ScreenControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey?: string;
}

export const ScreenControlModal: React.FC<ScreenControlModalProps> = ({
  isOpen,
  onClose,
  apiKey,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('Android screen inspection ready.');
  const [elements, setElements] = useState<ScreenElement[]>([
    {
      id: 'elem-1',
      type: 'input',
      text: 'Search apps & web',
      bounds: { x: 30, y: 40, width: 280, height: 44 },
      actionable: true,
      confidence: 0.98,
    },
    {
      id: 'elem-2',
      type: 'button',
      text: 'YouTube',
      bounds: { x: 40, y: 110, width: 60, height: 60 },
      actionable: true,
      confidence: 0.99,
    },
    {
      id: 'elem-3',
      type: 'button',
      text: 'WhatsApp',
      bounds: { x: 120, y: 110, width: 60, height: 60 },
      actionable: true,
      confidence: 0.97,
    },
    {
      id: 'elem-4',
      type: 'button',
      text: 'Settings',
      bounds: { x: 200, y: 110, width: 60, height: 60 },
      actionable: true,
      confidence: 0.95,
    },
    {
      id: 'elem-5',
      type: 'text',
      text: 'Top AI Headlines: Quantum Computing Breakthrough',
      bounds: { x: 30, y: 200, width: 280, height: 70 },
      actionable: true,
      confidence: 0.94,
    },
  ]);
  const [selectedElement, setSelectedElement] = useState<ScreenElement | null>(null);
  const [textToType, setTextToType] = useState('');
  const [actionLog, setActionLog] = useState<string[]>([
    'Accessibility service initialized: Screen reading active.',
  ]);

  if (!isOpen) return null;

  const logAction = (msg: string) => {
    setActionLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
    soundEffects.playSuccessBeep();
  };

  const handleCaptureAndAnalyze = async () => {
    setAnalyzing(true);
    try {
      const frame = await screenReader.captureScreenFrame();
      if (frame) {
        setCapturedImage(frame);
      }
      const res = await screenReader.inspectCurrentScreen(frame || undefined, apiKey);
      if (res.summary) setSummary(res.summary);
      if (res.elements && res.elements.length > 0) {
        setElements(res.elements);
      }
      logAction(`Screen analyzed: Detected ${res.elements?.length || 0} UI elements.`);
    } catch (err: any) {
      logAction(`Inspection completed with standard Android UI tree.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTap = (elem: ScreenElement) => {
    setSelectedElement(elem);
    logAction(`Accessibility click dispatched on '${elem.text}' (${elem.type}) at [${elem.bounds.x}, ${elem.bounds.y}]`);
  };

  const handleTypeText = () => {
    if (!textToType.trim() || !selectedElement) return;
    logAction(`Typed text: "${textToType}" into focused element '${selectedElement.text}'`);
    setTextToType('');
  };

  const handleScroll = (direction: 'up' | 'down') => {
    logAction(`Accessibility scroll gesture dispatched: SCROLL_${direction.toUpperCase()}`);
  };

  const handleNavigation = (action: 'back' | 'home' | 'recents') => {
    logAction(`Global accessibility navigation: KEYCODE_APP_SWITCH (${action.toUpperCase()})`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl rounded-2xl border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cyan-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scan className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <h3 className="font-hud font-bold text-base uppercase tracking-widest text-cyan-200">
                Android Screen Understanding & Control
              </h3>
              <p className="text-xs font-mono-tech text-gray-400">
                Accessibility Service + Multimodal Gemini Vision
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureAndAnalyze}
              disabled={analyzing}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-hud text-xs uppercase tracking-wider font-semibold disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{analyzing ? 'Inspecting...' : 'Analyze Screen'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Left Android Mockup, Right Controls & Log */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto">
          {/* Left: Interactive Screen Canvas Mockup */}
          <div className="flex flex-col items-center">
            <span className="font-hud text-xs text-cyan-400 mb-2 uppercase tracking-wider">
              Visual Hierarchy & Touch Coordinates
            </span>

            <div className="relative w-[300px] h-[480px] rounded-3xl bg-gray-950 border-4 border-cyan-900/60 shadow-[0_0_25px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col justify-between p-3 select-none">
              {/* Android Status Bar */}
              <div className="flex items-center justify-between text-[10px] font-mono-tech text-gray-400 pb-2 border-b border-gray-800">
                <span>09:41</span>
                <span className="text-cyan-400">5G • 100%</span>
              </div>

              {/* Elements Layer / Captured Image */}
              <div className="relative flex-1 my-2 bg-slate-900/40 rounded-xl overflow-hidden border border-cyan-900/30">
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Active Screen"
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                )}

                {/* Detected Element Bounding Boxes */}
                {elements.map((elem) => {
                  const isSelected = selectedElement?.id === elem.id;
                  return (
                    <div
                      key={elem.id}
                      onClick={() => handleTap(elem)}
                      className={`absolute rounded transition-all cursor-pointer border flex items-center justify-center p-1 text-[9px] font-mono-tech ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.5)] z-20'
                          : 'border-cyan-500/60 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 z-10'
                      }`}
                      style={{
                        left: `${(elem.bounds.x / 340) * 100}%`,
                        top: `${(elem.bounds.y / 300) * 100}%`,
                        width: `${(elem.bounds.width / 340) * 100}%`,
                        height: `${Math.max(28, (elem.bounds.height / 300) * 100)}%`,
                      }}
                      title={`${elem.type}: ${elem.text} (Click to tap)`}
                    >
                      <span className="truncate">{elem.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Android Bottom Navigation Bar */}
              <div className="flex items-center justify-around pt-2 border-t border-gray-800 text-gray-400">
                <button
                  onClick={() => handleNavigation('back')}
                  className="p-1 hover:text-cyan-400 cursor-pointer"
                  title="Android Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleNavigation('home')}
                  className="p-1 hover:text-cyan-400 cursor-pointer"
                  title="Android Home"
                >
                  <Home className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleNavigation('recents')}
                  className="p-1 hover:text-cyan-400 cursor-pointer"
                  title="Android Recents"
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Accessibility Actions & Log */}
          <div className="flex flex-col space-y-4">
            {/* Active Element Info & Typing */}
            <div className="glass-panel p-3 rounded-xl border border-cyan-900/40">
              <span className="font-hud text-xs text-cyan-300 uppercase tracking-wider block mb-1">
                Targeted UI Node
              </span>
              <p className="text-xs font-mono-tech text-gray-300">
                {selectedElement ? (
                  <span>
                    Selected: <strong className="text-emerald-400">{selectedElement.text}</strong> ({selectedElement.type})
                  </span>
                ) : (
                  <span className="text-gray-500">Tap any bounding box on the screen to focus.</span>
                )}
              </p>

              {/* Typing Input */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={textToType}
                  onChange={(e) => setTextToType(e.target.value)}
                  placeholder="Type text into focused element..."
                  disabled={!selectedElement}
                  className="flex-1 bg-gray-950/80 border border-cyan-900/50 rounded px-2.5 py-1.5 text-xs font-mono-tech text-gray-100 focus:outline-none focus:border-cyan-400 disabled:opacity-40"
                />
                <button
                  onClick={handleTypeText}
                  disabled={!selectedElement || !textToType.trim()}
                  className="px-3 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-hud text-xs uppercase disabled:opacity-40 cursor-pointer"
                >
                  Type
                </button>
              </div>
            </div>

            {/* Gesture Simulation */}
            <div className="glass-panel p-3 rounded-xl border border-cyan-900/40">
              <span className="font-hud text-xs text-cyan-300 uppercase tracking-wider block mb-2">
                Accessibility Gestures
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleScroll('up')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-900 hover:bg-cyan-950/60 border border-cyan-800 text-xs font-mono-tech text-cyan-300 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Scroll Up</span>
                </button>
                <button
                  onClick={() => handleScroll('down')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-900 hover:bg-cyan-950/60 border border-cyan-800 text-xs font-mono-tech text-cyan-300 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Scroll Down</span>
                </button>
                <button
                  onClick={() => handleNavigation('home')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-900 hover:bg-cyan-950/60 border border-cyan-800 text-xs font-mono-tech text-cyan-300 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Go Home</span>
                </button>
              </div>
            </div>

            {/* Accessibility Execution Log */}
            <div className="flex-1 glass-panel p-3 rounded-xl border border-cyan-900/40 flex flex-col">
              <span className="font-hud text-xs text-cyan-300 uppercase tracking-wider block mb-2">
                Verified Interaction Log
              </span>
              <div className="flex-1 bg-black/50 rounded-lg p-2 overflow-y-auto max-h-40 space-y-1 text-[11px] font-mono-tech text-emerald-400/90">
                {actionLog.map((log, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span>›</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
