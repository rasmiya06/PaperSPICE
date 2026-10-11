import React, { useState } from 'react';
import { GitBranch, Check, HelpCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { circuitAudio } from '../utils/audio';

export default function AmbiguityLab({ onSelectInterpretation, activeInterpretation }) {
  const [selected, setSelected] = useState(activeInterpretation || 'bridge'); // 'bridge' | 'junction'

  const handleSelect = (mode) => {
    setSelected(mode);
    circuitAudio.playBridgeChime();
    onSelectInterpretation(mode);
  };

  return (
    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Circuit Ambiguity Lab: Competing Hypotheses
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 font-mono">
                AI Differentiator
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              When hand-drawn ink is ambiguous, PaperSPICE does not hallucinate. It models competing electrical topologies.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hypothesis A: Connected 4-Way Junction */}
        <div
          onClick={() => handleSelect('junction')}
          className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 relative ${
            selected === 'junction'
              ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-amber-300">
              Hypothesis A: Connected Junction
            </span>
            {selected === 'junction' && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                ✓
              </span>
            )}
          </div>

          {/* SVG Diagram showing junction dot */}
          <div className="h-20 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center relative">
            <svg width="120" height="60" viewBox="0 0 120 60" className="overflow-visible">
              <line x1="10" y1="30" x2="110" y2="30" stroke="#0ea5e9" strokeWidth="3" />
              <line x1="60" y1="5" x2="60" y2="55" stroke="#0ea5e9" strokeWidth="3" />
              {/* Solder junction dot */}
              <circle cx="60" cy="30" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
            </svg>
            <span className="absolute bottom-1 right-2 text-[9px] font-mono text-amber-400">
              Solder Dot Detected
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Ink crossing has high pixel density. Interpreted as a <strong>4-way node</strong> sharing electrical potential ($V_1 = V_2$).
          </p>
        </div>

        {/* Hypothesis B: Unconnected Wire Bridge */}
        <div
          onClick={() => handleSelect('bridge')}
          className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 relative ${
            selected === 'bridge'
              ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-cyan-300">
              Hypothesis B: Unconnected Bridge (Overpass)
            </span>
            {selected === 'bridge' && (
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                ✓
              </span>
            )}
          </div>

          {/* SVG Diagram showing bridge arc */}
          <div className="h-20 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center relative">
            <svg width="120" height="60" viewBox="0 0 120 60" className="overflow-visible">
              <line x1="10" y1="30" x2="52" y2="30" stroke="#0ea5e9" strokeWidth="3" />
              {/* Bridge Arc */}
              <path d="M 52 30 Q 60 16 68 30" fill="none" stroke="#0ea5e9" strokeWidth="3" />
              <line x1="68" y1="30" x2="110" y2="30" stroke="#0ea5e9" strokeWidth="3" />
              <line x1="60" y1="5" x2="60" y2="55" stroke="#38bdf8" strokeWidth="3" />
            </svg>
            <span className="absolute bottom-1 right-2 text-[9px] font-mono text-cyan-400">
              Bridge Overpass
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Ink lines intersect without a physical connection dot. Interpreted as <strong>independent crossing lines</strong> (Galvanically Isolated).
          </p>
        </div>
      </div>

      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between text-slate-300">
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Active Simulation Hypothesis: <strong>{selected === 'junction' ? 'Hypothesis A (Connected Junction)' : 'Hypothesis B (Bridge Overpass)'}</strong></span>
        </span>
        <span className="text-[11px] text-slate-500 font-mono">Verified in MNA Solver</span>
      </div>
    </div>
  );
}
