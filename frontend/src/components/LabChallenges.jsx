import React, { useState } from 'react';
import { Sparkles, Trophy, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { circuitAudio } from '../utils/audio';

export const LAB_CHALLENGES = [
  {
    id: 'goldilocks',
    title: '🎯 Challenge 1: The Goldilocks Current',
    description: 'Tune the resistor so current is in the optimal 19.0 mA – 23.0 mA range without triggering burnout.',
    target: 'Current between 19.0 mA and 23.0 mA',
    check: (sim) => sim?.is_closed_loop && sim?.current_ma >= 19.0 && sim?.current_ma <= 23.0,
    hint: 'Try a resistance value near 300Ω – 350Ω with 9V supply.'
  },
  {
    id: 'eco_saver',
    title: '🔋 Challenge 2: The 50-Hour Battery Saver',
    description: 'Tune the circuit so the 550mAh battery runtime exceeds 50 continuous hours while the LED remains ON.',
    target: 'Battery runtime > 50.0 hours (Current < 11.0 mA)',
    check: (sim) => sim?.is_closed_loop && sim?.current_ma > 0.5 && sim?.current_ma < 11.0,
    hint: 'Increase resistance above 700Ω to drop current below 10 mA.'
  },
  {
    id: 'max_lumens',
    title: '🔥 Challenge 3: Maximum Lumens Threshold',
    description: 'Push the circuit to maximum safe brightness (26.0 mA – 29.5 mA) right before the 30 mA burnout explosion.',
    target: 'Current between 26.0 mA and 29.5 mA',
    check: (sim) => sim?.is_closed_loop && sim?.current_ma >= 26.0 && sim?.current_ma <= 29.5,
    hint: 'Tune resistance around 240Ω – 270Ω.'
  }
];

export default function LabChallenges({ simulation, onApplyHint }) {
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const challenge = LAB_CHALLENGES[activeChallengeIdx];
  const isSolved = challenge.check(simulation);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 rounded-2xl border border-indigo-800/60 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-indigo-900/60 pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
            Interactive Lab Challenges
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono">
              Mini-Game Mode
            </span>
          </h3>
        </div>

        <div className="flex gap-1.5">
          {LAB_CHALLENGES.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActiveChallengeIdx(i)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                activeChallengeIdx === i
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              #{i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="font-bold text-slate-200 flex items-center gap-2">
            <span>{challenge.title}</span>
            {isSolved && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-700 animate-bounce">
                <CheckCircle className="w-3.5 h-3.5" /> Solved!
              </span>
            )}
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            {challenge.description}
          </p>
        </div>

        <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-400 shrink-0">
          Target: {challenge.target}
        </div>
      </div>
    </div>
  );
}
