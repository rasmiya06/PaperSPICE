import React, { useState } from 'react';
import { Zap, Cpu, ShieldCheck, Eye, Terminal, Volume2, VolumeX, PenTool, Binary, Play, Bot, Sparkles } from 'lucide-react';
import { circuitAudio } from '../utils/audio';

export default function Header({ onOpenDraw, onOpenInspector, onOpenTour, onOpenCopilot }) {
  const [isMuted, setIsMuted] = useState(false);

  const toggleSound = () => {
    const muted = circuitAudio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Paper<span className="text-cyan-400">SPICE</span>
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              v1.0 Live
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Hand-Drawn Sketches <span className="text-cyan-500">➔</span> Verified Living Circuit Simulation & SPICE Netlists
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {/* 30-Second Guided Tour Button (Hero feature for judges & students!) */}
        <button
          onClick={onOpenTour}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold transition-all shadow-md shadow-cyan-500/25 ring-1 ring-cyan-400/50 animate-pulse"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>🎬 30s Guided Tour</span>
        </button>

        {/* AI Copilot Drawer Trigger */}
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/80 font-medium transition-colors shadow-sm"
        >
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Copilot</span>
        </button>

        {/* Action Buttons */}
        <button
          onClick={onOpenDraw}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-colors shadow-sm"
        >
          <PenTool className="w-3.5 h-3.5 text-cyan-400" />
          <span>Draw Pad</span>
        </button>

        <button
          onClick={onOpenInspector}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-colors shadow-sm"
        >
          <Binary className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Evidence</span>
        </button>

        {/* Audio Mute/Unmute */}
        <button
          onClick={toggleSound}
          className={`p-2 rounded-lg border transition-colors ${
            isMuted
              ? 'bg-slate-800 border-slate-700 text-slate-500'
              : 'bg-cyan-950/60 border-cyan-800/80 text-cyan-400 shadow-sm'
          }`}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Uncertainty Gate Active</span>
        </div>
      </div>
    </header>
  );
}
