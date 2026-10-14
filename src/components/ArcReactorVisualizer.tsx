import React, { useEffect, useState } from 'react';
import { JarvisStatus } from '../types/jarvis';

interface ArcReactorVisualizerProps {
  status: JarvisStatus;
  audioLevel?: number; // 0.0 to 1.0
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const ArcReactorVisualizer: React.FC<ArcReactorVisualizerProps> = ({
  status,
  audioLevel = 0,
  onClick,
  size = 'md',
}) => {
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    // Dynamically scale core according to real-time audio level
    const boost = Math.min(0.45, audioLevel * 0.9);
    setPulseScale(1 + boost);
  }, [audioLevel]);

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { width: 140, height: 140, strokeWidth: 2 };
      case 'lg':
        return { width: 280, height: 280, strokeWidth: 3.5 };
      case 'md':
      default:
        return { width: 210, height: 210, strokeWidth: 3 };
    }
  };

  const { width, height, strokeWidth } = getDimensions();
  const radius = width / 2;

  // Colors according to state
  const getThemeColors = () => {
    switch (status) {
      case 'SPEAKING':
        return {
          glow: 'rgba(52, 211, 153, 0.8)',
          ring: '#10b981',
          core: 'from-emerald-400 via-teal-300 to-cyan-500',
          text: 'text-emerald-300',
        };
      case 'LISTENING':
        return {
          glow: 'rgba(6, 182, 212, 0.85)',
          ring: '#06b6d4',
          core: 'from-cyan-400 via-sky-300 to-blue-500',
          text: 'text-cyan-300',
        };
      case 'THINKING':
        return {
          glow: 'rgba(245, 158, 11, 0.8)',
          ring: '#f59e0b',
          core: 'from-amber-400 via-yellow-300 to-orange-500',
          text: 'text-amber-300',
        };
      case 'INTERRUPTED':
        return {
          glow: 'rgba(244, 63, 94, 0.9)',
          ring: '#f43f5e',
          core: 'from-rose-500 via-pink-400 to-red-600',
          text: 'text-rose-300',
        };
      case 'ERROR':
        return {
          glow: 'rgba(239, 68, 68, 0.9)',
          ring: '#ef4444',
          core: 'from-red-500 via-orange-500 to-amber-600',
          text: 'text-red-300',
        };
      default:
        return {
          glow: 'rgba(6, 182, 212, 0.5)',
          ring: '#0891b2',
          core: 'from-cyan-600 via-teal-500 to-blue-700',
          text: 'text-cyan-400',
        };
    }
  };

  const theme = getThemeColors();

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center justify-center cursor-pointer select-none group transition-transform active:scale-95"
      style={{ width, height }}
      title={`JARVIS Status: ${status} (Click to interact)`}
    >
      {/* Outer ambient glow halo */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-60 transition-all duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
          transform: `scale(${pulseScale * 1.1})`,
        }}
      />

      {/* Futuristic SVG Arc Reactor Architecture */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 200 200"
        className="relative z-10 overflow-visible"
      >
        <defs>
          <radialGradient id="arcGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor={theme.ring} stopOpacity="0.6" />
            <stop offset="100%" stopColor="#030712" stopOpacity="0" />
          </radialGradient>

          <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Ring with Ticks */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke={theme.ring}
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />

        {/* Segmented Outer Spinner Ring */}
        <g
          className={`origin-center ${
            status === 'THINKING' ? 'animate-spin-fast' : 'animate-spin-slow'
          }`}
        >
          <circle
            cx="100"
            cy="100"
            r="84"
            fill="none"
            stroke={theme.ring}
            strokeWidth={strokeWidth}
            strokeDasharray="24 16 8 16"
            strokeLinecap="round"
            filter="url(#neonBlur)"
            strokeOpacity="0.85"
          />
        </g>

        {/* Counter-rotating Middle Ring */}
        <g
          className={`origin-center ${
            status === 'THINKING' ? 'animate-spin-fast' : 'animate-spin-reverse'
          }`}
        >
          <circle
            cx="100"
            cy="100"
            r="68"
            fill="none"
            stroke={theme.ring}
            strokeWidth="2"
            strokeDasharray="14 10 32 8"
            strokeOpacity="0.65"
          />
        </g>

        {/* 12 Stark Electromagnetic Coils */}
        <g className="origin-center">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = 100 + Math.cos(angle) * 52;
            const y1 = 100 + Math.sin(angle) * 52;
            const x2 = 100 + Math.cos(angle) * 66;
            const y2 = 100 + Math.sin(angle) * 66;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={theme.ring}
                strokeWidth={i % 3 === 0 ? '3' : '1.5'}
                strokeOpacity={i % 2 === 0 ? '0.9' : '0.4'}
                filter="url(#neonBlur)"
              />
            );
          })}
        </g>

        {/* Inner Ring Frame */}
        <circle
          cx="100"
          cy="100"
          r="48"
          fill="none"
          stroke={theme.ring}
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeOpacity="0.75"
        />

        {/* Reactive Core Orb */}
        <g style={{ transform: `scale(${pulseScale})`, transformOrigin: '100px 100px' }}>
          {/* Inner Glow Disc */}
          <circle cx="100" cy="100" r="38" fill="url(#arcGlow)" />

          {/* Core Concentric Energy Rings */}
          <circle
            cx="100"
            cy="100"
            r="28"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeOpacity="0.85"
            filter="url(#neonBlur)"
          />
          <circle
            cx="100"
            cy="100"
            r="16"
            fill="#ffffff"
            fillOpacity="0.9"
            filter="url(#neonBlur)"
          />
        </g>

        {/* Center Triangular/Hex Core Pattern */}
        <polygon
          points="100,82 116,110 84,110"
          fill="none"
          stroke={theme.ring}
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
      </svg>

      {/* Floating Status Label */}
      <div className="absolute -bottom-6 flex flex-col items-center">
        <span
          className={`font-mono-tech text-[11px] font-bold tracking-widest uppercase ${theme.text}`}
        >
          {status}
        </span>
        {audioLevel > 0.05 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <span className="w-1 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="w-1 h-3 rounded-full bg-cyan-300 animate-pulse delay-75" />
            <span className="w-1 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-150" />
          </div>
        )}
      </div>
    </div>
  );
};
