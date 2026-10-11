import React from 'react';
import { BookOpen, HelpCircle, Lightbulb, Zap, ShieldAlert, Cpu } from 'lucide-react';

export default function CircuitTutor({ simulation, resistance = 330, voltage = 9.0 }) {
  const currentMa = simulation?.current_ma ?? 21.21;
  const isOvercurrent = simulation?.led_state === 'OVERCURRENT_WARNING';

  return (
    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Explain & Learn: AI Circuit Tutor
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                Interactive Pedagogical Guide
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Grounds electrical physics in simple language, explaining the role of each component and the underlying mathematics.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Physical Role Breakdown */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
          <h4 className="font-bold text-slate-200 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Component Roles & Physical Functions</span>
          </h4>
          <ul className="space-y-2 text-slate-300 leading-relaxed text-[11px]">
            <li className="flex gap-2">
              <span className="font-bold text-cyan-400 shrink-0">• 9V Battery:</span>
              <span>Supplies constant DC chemical electromotive potential ($V_s = {voltage}\text{V}$), establishing the electric field across the wire loop.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-400 shrink-0">• SPST Switch:</span>
              <span>Mechanical air-gap contact. When closed, it closes the loop; when open, it creates infinite resistance ($R = \infty$), stopping current.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-amber-400 shrink-0">• {resistance}Ω Resistor:</span>
              <span>The <strong>current limiter</strong>. Without this resistor, the LED would face full battery voltage and instantly burn out. It absorbs the excess $7.0\text{V}$ drop.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-rose-400 shrink-0">• Red LED:</span>
              <span>A semiconductor diode requiring $\approx 2.0\text{V}$ forward threshold to conduct. Electrons crossing the p-n junction emit photons (red light).</span>
            </li>
          </ul>
        </div>

        {/* Mathematical Derivation */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
          <h4 className="font-bold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Ohm's & Kirchhoff's Law Derivation</span>
          </h4>
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
            <p className="text-cyan-400 font-bold">1. Kirchhoff's Voltage Law (KVL):</p>
            <p>V_source - V_resistor - V_diode = 0</p>
            <p className="text-amber-400 font-bold pt-1">2. Solving for Resistor Voltage:</p>
            <p>V_resistor = {voltage}V - 2.0V = 7.00V</p>
            <p className="text-emerald-400 font-bold pt-1">3. Current via Ohm's Law (I = V / R):</p>
            <p>I = 7.00V / {resistance}Ω = <span className="text-cyan-400 font-bold">{currentMa} mA</span></p>
          </div>
          <p className="text-[11px] text-slate-400">
            {isOvercurrent
              ? '💥 DANGER: Calculated current exceeds the 30 mA maximum limit. In a real circuit, the diode bond wire will fuse and explode.'
              : '✓ Nominal: Current is within the safe 15–25 mA operating window for bright, long-lasting LED illumination.'}
          </p>
        </div>
      </div>
    </div>
  );
}
