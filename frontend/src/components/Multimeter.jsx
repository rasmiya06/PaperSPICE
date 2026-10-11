import React from 'react';
import { Gauge, Activity, BatteryCharging, Flame, CheckCircle, XCircle } from 'lucide-react';

export default function Multimeter({ simulation }) {
  const currentMa = simulation?.current_ma ?? 0.0;
  const vSource = simulation?.voltage_source_v ?? 9.0;
  const vRes = simulation?.resistor_voltage_v ?? 0.0;
  const vLed = simulation?.led_voltage_v ?? 0.0;
  const pResMw = simulation?.resistor_power_mw ?? 0.0;
  const pLedMw = simulation?.led_power_mw ?? 0.0;
  const isConducting = simulation?.is_closed_loop && currentMa > 0;
  const statusMsg = simulation?.status_message || 'Awaiting simulation scan';

  return (
    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Digital Multimeter & Physics Telemetry
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {isConducting ? (
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
              <CheckCircle className="w-3 h-3" /> Conducting
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/60">
              <XCircle className="w-3 h-3 text-rose-400" /> Open Circuit (0 mA)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Branch Current */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Branch Current</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-mono font-bold text-cyan-400">
            {currentMa} <span className="text-xs font-normal text-slate-400">mA</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            I = (Vs - Vf) / R
          </div>
        </div>

        {/* Resistor Voltage Drop */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Resistor Drop</span>
            <span className="text-amber-400 font-mono text-[10px]">V_R</span>
          </div>
          <div className="text-xl font-mono font-bold text-amber-400">
            {vRes} <span className="text-xs font-normal text-slate-400">V</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            P = {pResMw} mW
          </div>
        </div>

        {/* LED Diode Drop */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>LED Forward Drop</span>
            <span className="text-rose-400 font-mono text-[10px]">V_f</span>
          </div>
          <div className="text-xl font-mono font-bold text-rose-400">
            {vLed} <span className="text-xs font-normal text-slate-400">V</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            P = {pLedMw} mW
          </div>
        </div>

        {/* Total Loop Power */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Total Power</span>
            <Flame className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-mono font-bold text-indigo-400">
            {Math.round(pResMw + pLedMw)} <span className="text-xs font-normal text-slate-400">mW</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Vs = {vSource} V
          </div>
        </div>
      </div>

      <div className="text-xs bg-slate-950/40 px-3 py-2 rounded-lg border border-slate-800/60 text-slate-300 font-mono flex items-center gap-2">
        <span className="text-cyan-400 font-bold">STATE:</span>
        <span>{statusMsg}</span>
      </div>
    </div>
  );
}
