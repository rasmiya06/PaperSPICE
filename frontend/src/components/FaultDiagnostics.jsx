import React from 'react';
import { ShieldAlert, Battery, Flame, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function FaultDiagnostics({ simulation, resistance = 330 }) {
  const currentMa = simulation?.current_ma ?? 0.0;
  const pResMw = simulation?.resistor_power_mw ?? 0.0;
  const pLedMw = simulation?.led_power_mw ?? 0.0;
  const isClosed = simulation?.is_closed_loop && currentMa > 0;

  // 1. Battery Life (550 mAh standard 9V battery)
  const batteryCapacityMah = 550;
  const runtimeHours = currentMa > 0 ? (batteryCapacityMah / currentMa).toFixed(1) : '∞ (Standby)';

  // 2. Resistor Thermal Rating Check (250mW = 1/4W standard)
  const isResistorOverheated = pResMw > 250.0;
  const resistorLoadPct = Math.round((pResMw / 250.0) * 100);

  // 3. LED Burnout Risk Check (> 30mA)
  const isLedOverdriven = currentMa > 30.0;

  return (
    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Safety & Thermal Reliability Analytics
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          MIL-STD / IPC-2221 Specs
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Battery Discharge Rate */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Battery Runtime</span>
            <Battery className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-mono font-bold text-slate-100">
            {runtimeHours} {currentMa > 0 ? <span className="text-xs text-slate-400 font-normal">hours</span> : ''}
          </div>
          <p className="text-[10px] text-slate-500">
            Based on 550mAh 9V Alkaline cell
          </p>
        </div>

        {/* Metric 2: Resistor Thermal Load */}
        <div className={`p-3 rounded-xl border space-y-1 ${
          isResistorOverheated
            ? 'bg-rose-950/40 border-rose-800 text-rose-200'
            : 'bg-slate-950/70 border-slate-800/80 text-slate-100'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Resistor Thermal</span>
            <Flame className={`w-4 h-4 ${isResistorOverheated ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
          </div>
          <div className="text-lg font-mono font-bold flex items-center gap-1.5">
            <span>{resistorLoadPct}%</span>
            <span className="text-xs font-normal text-slate-400">of 1/4W rating</span>
          </div>
          <p className="text-[10px] text-slate-400">
            {isResistorOverheated ? '⚠️ Thermal overload! Upgrade to 1/2W.' : 'Safe operating dissipation (0.25W max).'}
          </p>
        </div>

        {/* Metric 3: LED Diode Junction Health */}
        <div className={`p-3 rounded-xl border space-y-1 ${
          isLedOverdriven
            ? 'bg-rose-950/40 border-rose-800 text-rose-200'
            : 'bg-slate-950/70 border-slate-800/80 text-slate-100'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>LED Junction</span>
            {isLedOverdriven ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-ping" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="text-lg font-mono font-bold flex items-center gap-1.5">
            <span>{isLedOverdriven ? 'BURNOUT RISK' : 'HEALTHY'}</span>
          </div>
          <p className="text-[10px] text-slate-400">
            {isLedOverdriven ? `Excess current (${currentMa}mA > 30mA max)!` : 'Current is within 30mA continuous rating.'}
          </p>
        </div>
      </div>
    </div>
  );
}
