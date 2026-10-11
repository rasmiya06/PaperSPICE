import React from 'react';
import { Palette, Sparkles } from 'lucide-react';

export const LED_SPECS = {
  red: {
    id: 'red',
    name: 'Ruby Red',
    colorHex: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.8)',
    vf: 2.0,
    wavelength: '650 nm',
    material: 'AlGaAs (Aluminium Gallium Arsenide)'
  },
  green: {
    id: 'green',
    name: 'Emerald Green',
    colorHex: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    vf: 2.2,
    wavelength: '525 nm',
    material: 'InGaN (Indium Gallium Nitride)'
  },
  blue: {
    id: 'blue',
    name: 'Cobalt Blue',
    colorHex: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.8)',
    vf: 3.2,
    wavelength: '470 nm',
    material: 'GaN (Gallium Nitride - Nobel 2014)'
  },
  yellow: {
    id: 'yellow',
    name: 'Amber Yellow',
    colorHex: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    vf: 2.1,
    wavelength: '590 nm',
    material: 'GaAsP (Gallium Arsenide Phosphide)'
  },
  purple: {
    id: 'purple',
    name: 'UV Violet',
    colorHex: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    vf: 3.4,
    wavelength: '405 nm',
    material: 'InGaN Near-UV Quantum Well'
  },
  white: {
    id: 'white',
    name: 'Cool White',
    colorHex: '#f8fafc',
    glowColor: 'rgba(255, 255, 255, 0.9)',
    vf: 3.0,
    wavelength: '6500 K',
    material: 'Blue GaN + YAG Phosphor'
  }
};

export default function LEDColorPicker({ selectedColor = 'red', onSelectColor }) {
  const activeSpec = LED_SPECS[selectedColor] || LED_SPECS.red;

  return (
    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Diode Semiconductor Chemistry & Color
          </h3>
        </div>
        <span className="text-[11px] font-mono text-cyan-400">
          Vf = {activeSpec.vf}V Drop
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Object.values(LED_SPECS).map((spec) => {
          const isSelected = selectedColor === spec.id;
          return (
            <button
              key={spec.id}
              onClick={() => onSelectColor(spec.id)}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                isSelected
                  ? 'bg-slate-800 border-white shadow-lg shadow-cyan-500/10 scale-105'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full shadow-md"
                style={{ backgroundColor: spec.colorHex }}
              />
              <span className="text-[11px] font-bold text-slate-200">{spec.name}</span>
              <span className="text-[9px] font-mono text-slate-400">{spec.vf}V</span>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 flex items-center justify-between font-mono">
        <span>Semiconductor: <strong>{activeSpec.material}</strong></span>
        <span className="text-cyan-400">λ: {activeSpec.wavelength}</span>
      </div>
    </div>
  );
}
