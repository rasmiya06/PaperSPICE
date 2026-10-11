import React from 'react';
import { Sliders, RotateCcw, AlertOctagon, Radio, Activity, Zap } from 'lucide-react';
import { circuitAudio } from '../utils/audio';

export default function PhysicsControls({
  voltage,
  onVoltageChange,
  resistance,
  onResistanceChange,
  simulation,
  signalMode = 'dc',
  onSignalModeChange,
  pwmDuty = 65,
  onPwmDutyChange,
  acFreq = 50,
  onAcFreqChange
}) {
  const isOvercurrent = simulation?.led_state === 'OVERCURRENT_WARNING';

  const handleModeChange = (mode) => {
    circuitAudio.playProbeBeep(mode === 'dc' ? 1200 : mode === 'ac' ? 1500 : 1800);
    if (onSignalModeChange) onSignalModeChange(mode);
  };

  return (
    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Real-Time Parameter Tuner & Signal Generator
          </h3>
        </div>
        {isOvercurrent && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800 animate-pulse">
            <AlertOctagon className="w-3.5 h-3.5" />
            Overcurrent Alert
          </span>
        )}
      </div>

      {/* Signal Generator Mode Selection */}
      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Excitation Waveform:
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
            {signalMode.toUpperCase()} Source
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleModeChange('dc')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
              signalMode === 'dc'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            DC Steady (9V)
          </button>

          <button
            onClick={() => handleModeChange('ac')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
              signalMode === 'ac'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            AC Sine (50Hz)
          </button>

          <button
            onClick={() => handleModeChange('pwm')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
              signalMode === 'pwm'
                ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            PWM Pulser
          </button>
        </div>

        {/* Dynamic Waveform Controls */}
        {signalMode === 'pwm' && (
          <div className="pt-2 border-t border-slate-800/80 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">PWM Duty Cycle:</span>
              <span className="font-mono text-amber-400 font-bold">{pwmDuty}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="95"
              step="5"
              value={pwmDuty}
              onChange={(e) => onPwmDutyChange && onPwmDutyChange(parseInt(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5% (Dim)</span>
              <span>50%</span>
              <span>95% (Bright)</span>
            </div>
          </div>
        )}

        {signalMode === 'ac' && (
          <div className="pt-2 border-t border-slate-800/80 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">AC Alternating Frequency:</span>
              <span className="font-mono text-indigo-400 font-bold">{acFreq} Hz</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={acFreq}
              onChange={(e) => onAcFreqChange && onAcFreqChange(parseInt(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>10 Hz (Flicker)</span>
              <span>50 Hz (Mains)</span>
              <span>200 Hz (Smooth)</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Voltage Source Slider */}
        <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Supply Voltage ($V_s$):</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">{voltage} V</span>
          </div>
          <input
            type="range"
            min="2.5"
            max="15.0"
            step="0.5"
            value={voltage}
            onChange={(e) => onVoltageChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>2.5V</span>
            <span>9.0V (Default)</span>
            <span>15.0V</span>
          </div>
        </div>

        {/* Resistor Slider */}
        <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Resistance ($R$):</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{resistance} Ω</span>
          </div>
          <input
            type="range"
            min="50"
            max="1500"
            step="10"
            value={resistance}
            onChange={(e) => onResistanceChange(parseFloat(e.target.value))}
            className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>50Ω (Surge)</span>
            <span>330Ω (Nominal)</span>
            <span>1500Ω (Dim)</span>
          </div>
        </div>
      </div>

      {/* Quick Preset Resistance Chips */}
      <div className="flex items-center gap-2 pt-1 text-xs">
        <span className="text-slate-400 text-[11px]">Quick Tests:</span>
        <button
          onClick={() => {
            circuitAudio.playProbeBeep(1200);
            onResistanceChange(330);
          }}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
            resistance === 330
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          330Ω (Nominal 21.2mA)
        </button>
        <button
          onClick={() => {
            circuitAudio.playBurnoutPop();
            onResistanceChange(100);
          }}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
            resistance === 100
              ? 'bg-rose-600 text-white border-rose-500 font-bold'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          100Ω (Overcurrent 70mA)
        </button>
        <button
          onClick={() => {
            circuitAudio.playProbeBeep(1000);
            onResistanceChange(1000);
          }}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
            resistance === 1000
              ? 'bg-cyan-600 text-white border-cyan-500 font-bold'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          1kΩ (Dim 7mA)
        </button>
      </div>
    </div>
  );
}
