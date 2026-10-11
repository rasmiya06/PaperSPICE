import React, { useRef, useEffect, useState } from 'react';
import { Activity, Radio, Play, Pause, RefreshCw, Zap } from 'lucide-react';

export default function Oscilloscope({
  simulation,
  switchState,
  signalMode = 'dc',
  pwmDuty = 65,
  acFreq = 50
}) {
  const canvasRef = useRef(null);
  const [channel, setChannel] = useState('current'); // 'voltage' | 'current' | 'power'
  const [isFrozen, setIsFrozen] = useState(false);
  const [timebase, setTimebase] = useState(2); // ms/div
  const historyRef = useRef([]);

  const currentMa = simulation?.current_ma ?? 0.0;
  const voltageV = switchState === 'closed' && simulation?.is_closed_loop ? (simulation?.voltage_source_v ?? 9.0) : 0.0;
  const powerMw = switchState === 'closed' && simulation?.is_closed_loop ? (simulation?.resistor_power_mw ?? 0.0) + (simulation?.led_power_mw ?? 0.0) : 0.0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const tNow = performance.now() / 1000;

      // Append new sample to history if not frozen
      if (!isFrozen) {
        let targetVal = 0;

        if (signalMode === 'ac') {
          // AC Alternating Current (Sinusoidal)
          const angle = 2 * Math.PI * (acFreq * 0.12) * tNow;
          const sine = Math.sin(angle);

          if (channel === 'voltage') {
            targetVal = voltageV * sine;
          } else if (channel === 'current') {
            // Half-wave diode rectification: conducts only when sine > Vf/Vsource (2.0/9.0 = 0.222)
            const forwardThreshold = 0.222;
            targetVal = sine > forwardThreshold ? currentMa * ((sine - forwardThreshold) / (1 - forwardThreshold)) : 0;
          } else {
            const forwardThreshold = 0.222;
            targetVal = sine > forwardThreshold ? powerMw * ((sine - forwardThreshold) / (1 - forwardThreshold)) : 0;
          }
        } else if (signalMode === 'pwm') {
          // Digital PWM Square Pulse Train
          const pwmPeriod = 0.18; // visually pleasant pulse width
          const phase = (tNow % pwmPeriod) / pwmPeriod;
          const isHigh = phase < (pwmDuty / 100);

          if (channel === 'voltage') targetVal = isHigh ? voltageV : 0;
          else if (channel === 'current') targetVal = isHigh ? currentMa : 0;
          else if (channel === 'power') targetVal = isHigh ? powerMw : 0;
        } else {
          // Standard DC Steady State
          if (channel === 'voltage') targetVal = voltageV;
          else if (channel === 'current') targetVal = currentMa;
          else if (channel === 'power') targetVal = powerMw;
        }

        // Slight micro-jitter for analog CRT authenticity
        const noise = Math.abs(targetVal) > 0 ? (Math.random() - 0.5) * (Math.abs(targetVal) * 0.02) : 0;
        historyRef.current.push(targetVal + noise);

        // Keep maximum 300 points
        if (historyRef.current.length > 300) {
          historyRef.current.shift();
        }
      }

      // 1. Draw CRT Dark Phosphor Background
      ctx.fillStyle = '#03080e';
      ctx.fillRect(0, 0, w, h);

      // 2. Draw Phosphor Grid Lines (8x6 divisions)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.lineWidth = 1;
      const divX = w / 8;
      const divY = h / 6;

      for (let x = 0; x <= w; x += divX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += divY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center crosshairs with subtle tick marks
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // 3. Draw Waveform Trace
      const pts = historyRef.current;
      if (pts.length > 1) {
        ctx.save();
        ctx.beginPath();

        // Max scale based on channel
        let maxScale = 10;
        let traceColor = '#38bdf8';
        if (channel === 'voltage') {
          maxScale = 15;
          traceColor = '#22d3ee'; // Cyan
        } else if (channel === 'current') {
          maxScale = 80;
          traceColor = '#4ade80'; // Emerald Green
        } else {
          maxScale = 250;
          traceColor = '#fbbf24'; // Amber
        }

        // Center baseline for AC (so AC can swing negative), bottom baseline for DC/PWM
        const baselineY = signalMode === 'ac' ? h * 0.5 : h * 0.82;
        const scaleY = (signalMode === 'ac' ? (h * 0.4) : (h * 0.65)) / maxScale;
        const stepX = w / 300;

        pts.forEach((val, i) => {
          const x = i * stepX;
          const y = baselineY - (val * scaleY);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        // Glowing Trace effect
        ctx.strokeStyle = traceColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = traceColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }

      // 4. On-screen CRT Telemetry Text
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.fillText(`CH1: ${channel.toUpperCase()} (${signalMode.toUpperCase()})`, 12, 18);
      ctx.fillStyle = '#64748b';
      ctx.fillText(`TIMEBASE: ${timebase} ms/div`, 150, 18);
      ctx.fillText(`TRIGGER: AUTO`, 270, 18);

      const latestVal = pts[pts.length - 1] ?? 0;
      ctx.fillStyle = channel === 'current' ? '#4ade80' : (channel === 'voltage' ? '#22d3ee' : '#fbbf24');
      ctx.font = 'bold 12px monospace';
      const unit = channel === 'voltage' ? 'V' : (channel === 'current' ? 'mA' : 'mW');
      ctx.fillText(`VAL: ${latestVal.toFixed(2)} ${unit}`, w - 125, 18);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [channel, isFrozen, timebase, currentMa, voltageV, powerMw, signalMode, pwmDuty, acFreq]);

  return (
    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            Real-Time CRT Oscilloscope
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              {signalMode.toUpperCase()} Sync
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
              isFrozen
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {isFrozen ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isFrozen ? 'Resume' : 'Hold'}</span>
          </button>
        </div>
      </div>

      {/* Screen */}
      <div className="relative rounded-xl overflow-hidden border border-cyan-900/50 shadow-inner bg-black">
        <canvas
          ref={canvasRef}
          width={540}
          height={200}
          className="w-full h-[180px] block"
        />
      </div>

      {/* Channel & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setChannel('current')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              channel === 'current'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CH1 Current ($I$)
          </button>
          <button
            onClick={() => setChannel('voltage')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              channel === 'voltage'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CH2 Voltage ($V$)
          </button>
          <button
            onClick={() => setChannel('power')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              channel === 'power'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CH3 Power ($P$)
          </button>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>Scale:</span>
          {[1, 2, 5].map((tb) => (
            <button
              key={tb}
              onClick={() => setTimebase(tb)}
              className={`px-2 py-0.5 rounded border text-[10px] font-mono ${
                timebase === tb
                  ? 'bg-cyan-600 text-white border-cyan-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {tb}ms
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
