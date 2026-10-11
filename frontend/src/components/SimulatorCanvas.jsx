import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Zap, Power, AlertTriangle, Sparkles, Flame, Sliders, Radio, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { circuitAudio } from '../utils/audio';
import { LED_SPECS } from './LEDColorPicker';

export default function SimulatorCanvas({
  simulation,
  components = [],
  switchState,
  onToggleSwitch,
  voltage = 9.0,
  resistance = 330.0,
  isSimRunning = true,
  onToggleSim,
  ledColor = 'red',
  hasImage = true,
  onLoadHeroPreset,
  uncertainGaps = [],
  bridgedGaps = [],
  onBridgeAllGaps,
  onVoltageChange,
  onResistanceChange,
  logicInputs = { a: 1, b: 1 },
  onToggleLogicPin
}) {
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);
  const particlesRef = useRef([]);
  const smokeParticlesRef = useRef([]);

  // Active Voltage Probe (interactive inspection)
  const [activeProbe, setActiveProbe] = useState(null);
  const [isThermalMode, setIsThermalMode] = useState(false);

  const isDigital = simulation?.circuit_type === 'DIGITAL_LOGIC';
  const logicA = logicInputs?.a ?? 1;
  const logicB = logicInputs?.b ?? 1;
  const logicC = logicInputs?.c ?? 1;

  const hasUnbridgedGaps = hasImage && uncertainGaps.length > 0 && bridgedGaps.length < uncertainGaps.length;
  const currentMa = simulation?.current_ma || 0.0;
  const isOvercurrent = simulation?.led_state === 'OVERCURRENT_WARNING';
  const isConducting = hasImage && isSimRunning && simulation?.is_closed_loop && switchState === 'closed' && !hasUnbridgedGaps;

  // Gate output logic computed from backend simulation or live logic cascade
  const gateOutput = isConducting ? (simulation?.logic_output ?? (logicA === 1 && logicB === 1 ? 1 : 0)) : 0;

  // Current LED color spec
  const spec = LED_SPECS[ledColor] || LED_SPECS.red;

  // Initialize electron particles around the perimeter
  useEffect(() => {
    const numParticles = 28;
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        progress: i / numParticles,
        size: Math.random() * 1.5 + 2.5
      });
    }
    particlesRef.current = particles;
  }, []);

  // Trigger burnout sound effect on overcurrent
  useEffect(() => {
    if (isConducting && isOvercurrent) {
      circuitAudio.playBurnoutPop();
    }
  }, [isConducting, isOvercurrent]);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const speed = isConducting ? Math.min(0.008, Math.max(0.0008, (currentMa / 21.21) * 0.0028)) : 0.0;
    let t = 0;

    const render = () => {
      t += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear Canvas Background
      if (isThermalMode) {
        // FLIR Ironbow Dark Indigo Background
        ctx.fillStyle = '#060416';
        ctx.fillRect(0, 0, width, height);

        // Thermal sensor grain/raster lines
        ctx.strokeStyle = 'rgba(76, 29, 149, 0.2)';
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 18) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else {
        // High-Tech Laboratory Dark Slate Grid
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 25) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 25) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // If no circuit image has been ingested yet: render standby radar reticle
      if (!hasImage) {
        ctx.save();
        // Concentric radar scan rings
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.2)';
        ctx.lineWidth = 1.5;
        [40, 80, 120, 160].forEach((r) => {
          ctx.beginPath();
          ctx.arc(width * 0.5, height * 0.5, r, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Rotating radar beam
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width * 0.5, height * 0.5);
        ctx.lineTo(
          width * 0.5 + Math.cos(t) * 160,
          height * 0.5 + Math.sin(t) * 160
        );
        ctx.stroke();

        // Standby Text
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SIMULATION ENGINE STANDBY', width * 0.5, height * 0.45);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText('Awaiting hand-drawn sketch or test preset to reconstruct circuit physics', width * 0.5, height * 0.52);

        ctx.restore();
        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      // Calculate Physical Heat Dissipation
      const powerResistorWatts = (currentMa / 1000) * (currentMa / 1000) * resistance;
      const tempResistorC = (24.5 + (isConducting ? powerResistorWatts * 240 : 0)).toFixed(1);
      const powerLedWatts = (currentMa / 1000) * spec.vf;
      const tempLedC = (24.5 + (isConducting ? powerLedWatts * 120 : 0)).toFixed(1);

      // Circuit Coordinates
      const padX = 75;
      const padY = 55;
      const left = padX;
      const right = width - padX;
      const top = padY;
      const bottom = height - padY;

      if (isDigital) {
        drawDigitalLogicSimulation(
          ctx,
          width,
          height,
          logicA,
          logicB,
          logicC,
          gateOutput,
          isConducting,
          hasUnbridgedGaps,
          uncertainGaps,
          bridgedGaps,
          spec,
          t,
          isThermalMode,
          components,
          simulation
        );
      } else {
        // 2. Draw Wire Paths
        if (isThermalMode) {
          ctx.strokeStyle = isConducting ? '#7c3aed' : '#1e1b4b';
          ctx.lineWidth = 3.5;
        } else {
          ctx.strokeStyle = isConducting ? '#0ea5e9' : '#334155';
          ctx.lineWidth = 3;
        }
        ctx.lineJoin = 'round';

        // Top Wire (Battery Pos -> Switch, Switch -> Resistor)
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(width * 0.42, top);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(width * 0.58, top);
        ctx.lineTo(right, top);
        ctx.stroke();

        // Right Wire (Top -> Resistor, Resistor -> Bottom)
        ctx.beginPath();
        ctx.moveTo(right, top);
        ctx.lineTo(right, height * 0.38);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(right, height * 0.62);
        ctx.lineTo(right, bottom);
        ctx.stroke();

        // Bottom Wire (Resistor -> LED Anode, LED Cathode -> Battery Neg)
        ctx.beginPath();
        ctx.moveTo(right, bottom);
        ctx.lineTo(width * 0.58, bottom);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(width * 0.42, bottom);
        ctx.lineTo(left, bottom);
        ctx.stroke();

        // Left Wire (Bottom -> Battery Neg, Battery Pos -> Top)
        ctx.beginPath();
        ctx.moveTo(left, bottom);
        ctx.lineTo(left, height * 0.60);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(left, height * 0.40);
        ctx.lineTo(left, top);
        ctx.stroke();

        // 3. Flowing Electron Particles
        if (isConducting && speed > 0 && !isOvercurrent) {
          particlesRef.current.forEach((p) => {
            p.progress = (p.progress + speed) % 1.0;
            const pt = getPointAlongPerimeter(p.progress, left, right, top, bottom);

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = isThermalMode ? '#f59e0b' : '#38bdf8';
            ctx.shadowColor = isThermalMode ? '#f97316' : '#06b6d4';
            ctx.shadowBlur = isThermalMode ? 10 : 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          });
        }

        // 4. Draw Components
        drawBattery(ctx, left, height * 0.5, voltage, isThermalMode);
        drawSwitch(ctx, width * 0.5, top, switchState, isThermalMode);

        // Resistor with Thermal Heat Bloom
        drawResistor(ctx, right, height * 0.5, resistance, isThermalMode, tempResistorC, isConducting);

        // 5. Draw LED & Tinkercad-Style Burnout FX
        const ledBrightness = simulation?.led_brightness || 0.0;
        drawLED(ctx, width * 0.5, bottom, isConducting, ledBrightness, isOvercurrent, spec, isThermalMode, tempLedC);

        // Tinkercad Burnout Explosion & Smoke
        if (isConducting && isOvercurrent) {
          drawTinkercadExplosion(ctx, width * 0.5, bottom, smokeParticlesRef);
        }

        // 6. Draw Interactive Voltage Test Nodes
        drawProbeNodes(ctx, left, right, top, bottom, width, height, activeProbe, spec, isThermalMode);

        // 7. FLIR Thermal HUD Overlay & Temperature Calibration Scale
        if (isThermalMode) {
          drawFlirHud(ctx, width, height, tempResistorC, tempLedC);
        }
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId.current);
  }, [
    simulation, switchState, voltage, resistance, isConducting, isOvercurrent,
    activeProbe, spec, isThermalMode, hasImage, isDigital, logicA, logicB,
    gateOutput, components, hasUnbridgedGaps, uncertainGaps, bridgedGaps
  ]);

  const handleSelectProbe = (nodeId) => {
    if (!hasImage) return;
    circuitAudio.playProbeBeep(nodeId === 'vcc' ? 1600 : nodeId === 'node2' ? 1300 : 1000);
    setActiveProbe(activeProbe === nodeId ? null : nodeId);
  };

  const handleToggleThermal = () => {
    circuitAudio.playThermalWhoosh();
    setIsThermalMode(!isThermalMode);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Top Control Toolbar */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Live Interactive Circuit Simulation Canvas
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Digital Logic Interactive Input Controls */}
          {isDigital && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs shadow-inner">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TTL Pins:</span>
              <button
                onClick={() => onToggleLogicPin && onToggleLogicPin('a')}
                className={`px-2.5 py-0.5 rounded-lg font-mono font-bold text-[11px] border transition-all ${
                  logicA === 1
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Click to toggle Logic Input A"
              >
                In A: {logicA}
              </button>
              <button
                onClick={() => onToggleLogicPin && onToggleLogicPin('b')}
                className={`px-2.5 py-0.5 rounded-lg font-mono font-bold text-[11px] border transition-all ${
                  logicB === 1
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Click to toggle Logic Input B"
              >
                In B: {logicB}
              </button>
              <button
                onClick={() => onToggleLogicPin && onToggleLogicPin('c')}
                className={`px-2.5 py-0.5 rounded-lg font-mono font-bold text-[11px] border transition-all ${
                  logicC === 1
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Click to toggle Logic Input C"
              >
                In C: {logicC}
              </button>
              <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[11px] border ${
                gateOutput === 1
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-600 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}>
                Out Y: {gateOutput}
              </span>
            </div>
          )}

          {/* Uncertainty Gate Quick Bridge Badge */}
          {hasImage && hasUnbridgedGaps && (
            <button
              onClick={onBridgeAllGaps}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all animate-pulse"
              title="Click to bridge pencil gaps and start simulation"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Bridge {uncertainGaps.length - bridgedGaps.length} Gaps</span>
            </button>
          )}

          {/* Live Current Readout */}
          {hasImage && isConducting && (
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800 flex items-center gap-1">
              ⚡ {currentMa.toFixed(1)} mA
            </span>
          )}

          {/* FLIR Thermal IR Vision Toggle */}
          <button
            onClick={handleToggleThermal}
            disabled={!hasImage}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-40 ${
              isThermalMode
                ? 'bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 text-white shadow-rose-600/30 ring-1 ring-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Toggle FLIR Thermal Infrared Heat Signature"
          >
            <Flame className={`w-3.5 h-3.5 ${isThermalMode ? 'text-amber-300 animate-pulse' : 'text-slate-400'}`} />
            <span>FLIR Thermal IR: {isThermalMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Switch Toggle */}
          <button
            onClick={onToggleSwitch}
            disabled={!hasImage}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-40 ${
              switchState === 'closed'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>Switch: {switchState === 'closed' ? 'CLOSED' : 'OPEN'}</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-3 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={560}
          height={380}
          onClick={(e) => {
            if (!hasImage) {
              if (onLoadHeroPreset) onLoadHeroPreset();
              return;
            }
            if (hasUnbridgedGaps) {
              if (onBridgeAllGaps) onBridgeAllGaps();
              return;
            }
            if (isDigital) {
              const canvas = canvasRef.current;
              if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
                const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;
                if (clickX < 140 && Math.abs(clickY - canvas.height * 0.25) < 30) {
                  if (onToggleLogicPin) onToggleLogicPin('a');
                  return;
                }
                if (clickX < 140 && Math.abs(clickY - canvas.height * 0.48) < 30) {
                  if (onToggleLogicPin) onToggleLogicPin('b');
                  return;
                }
                if (clickX < 140 && Math.abs(clickY - canvas.height * 0.72) < 30) {
                  if (onToggleLogicPin) onToggleLogicPin('c');
                  return;
                }
              }
            }
            if (onToggleSwitch) onToggleSwitch();
          }}
          className={`rounded-xl border border-slate-800/60 shadow-inner ${hasImage ? 'cursor-pointer' : 'cursor-default'}`}
        />

        {/* Prominent Uncertainty Gate Notice Banner */}
        {hasImage && hasUnbridgedGaps && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-slate-900/95 border-2 border-amber-500 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs z-20 animate-pulse">
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>Circuit Loop Open (0.00 mA)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                    {uncertainGaps.length - bridgedGaps.length} Gaps on Paper
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Uncertainty Gate paused current. Click to bridge & start 60 FPS physics!
                </p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); if (onBridgeAllGaps) onBridgeAllGaps(); }}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/30 flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Bridge Gaps</span>
            </button>
          </div>
        )}

        {/* Quick Launch Button in Standby */}
        {!hasImage && (
          <button
            onClick={onLoadHeroPreset}
            className="absolute bottom-12 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-cyan-600/30 transition-all animate-bounce"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Click to Load Hero Circuit Sketch</span>
          </button>
        )}

        {/* Tinkercad Alert Overlay Banner */}
        {hasImage && isConducting && isOvercurrent && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-rose-950/90 border border-rose-500/80 px-4 py-2 rounded-xl text-rose-200 text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md animate-bounce">
            <span className="text-lg">💥</span>
            <span>Component Overload! LED Current is {currentMa} mA (Rating: 30 mA)!</span>
          </div>
        )}

        {/* Bottom Probe Selector Chips */}
        {hasImage && (
          <div className="absolute bottom-5 left-5 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-bold">Multimeter Probes:</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleSelectProbe('vcc'); }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                activeProbe === 'vcc' ? 'bg-cyan-600 text-white border-cyan-500 font-bold shadow-md' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Probe 1 (+{voltage}V)
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleSelectProbe('node2'); }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                activeProbe === 'node2' ? 'bg-amber-600 text-white border-amber-500 font-bold shadow-md' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Probe 2 (SW Out)
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleSelectProbe('node3'); }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                activeProbe === 'node3' ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-md' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Probe 3 (LED: +{spec.vf}V)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helpers
function getPointAlongPerimeter(t, left, right, top, bottom) {
  const w = right - left;
  const h = bottom - top;
  const total = 2 * (w + h);
  const dist = t * total;

  if (dist < w) return { x: left + dist, y: top };
  else if (dist < w + h) return { x: right, y: top + (dist - w) };
  else if (dist < 2 * w + h) return { x: right - (dist - (w + h)), y: bottom };
  else return { x: left, y: bottom - (dist - (2 * w + h)) };
}

function drawBattery(ctx, x, y, voltage, isThermal) {
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x - 22, y - 20);
  ctx.lineTo(x + 22, y - 20);
  ctx.stroke();

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 6);
  ctx.lineTo(x + 12, y - 6);
  ctx.stroke();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 22, y + 8);
  ctx.lineTo(x + 22, y + 8);
  ctx.stroke();

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 22);
  ctx.lineTo(x + 12, y + 22);
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText('+', x - 32, y - 16);
  ctx.fillStyle = '#64748b';
  ctx.fillText('-', x - 30, y + 26);

  ctx.fillStyle = isThermal ? '#38bdf8' : '#f8fafc';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillText(`${voltage}V DC`, x - 55, y + 5);
  ctx.restore();
}

function drawSwitch(ctx, x, y, state, isThermal) {
  ctx.save();
  const contactDist = 26;

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(x - contactDist, y, 4, 0, Math.PI * 2);
  ctx.arc(x + contactDist, y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = state === 'closed' ? '#10b981' : '#f43f5e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - contactDist, y);

  if (state === 'closed') {
    ctx.lineTo(x + contactDist, y);
  } else {
    ctx.lineTo(x + contactDist - 4, y - 22);
  }
  ctx.stroke();

  ctx.fillStyle = state === 'closed' ? '#10b981' : '#f43f5e';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state === 'closed' ? 'SW: CLOSED' : 'SW: OPEN', x, y - 24);
  ctx.restore();
}

function drawResistor(ctx, x, y, ohms, isThermal, tempC, isConducting) {
  ctx.save();

  // If in FLIR Thermal Mode: Draw radiant heat blooming
  if (isThermal && isConducting) {
    const tempNum = parseFloat(tempC);
    const heatBloomR = Math.min(65, Math.max(25, 25 + (tempNum - 24) * 0.35));

    const heatGrad = ctx.createRadialGradient(x, y, 4, x, y, heatBloomR);
    if (tempNum > 100) {
      heatGrad.addColorStop(0, '#ffffff'); // Blazing white
      heatGrad.addColorStop(0.3, '#facc15'); // Blazing yellow
      heatGrad.addColorStop(0.6, '#f97316'); // Blazing orange
      heatGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
    } else {
      heatGrad.addColorStop(0, '#facc15'); // Yellow core
      heatGrad.addColorStop(0.4, '#ea580c'); // Warm orange
      heatGrad.addColorStop(0.8, '#9333ea'); // Purple boundary
      heatGrad.addColorStop(1, 'rgba(30, 27, 75, 0)');
    }
    ctx.fillStyle = heatGrad;
    ctx.beginPath();
    ctx.arc(x, y, heatBloomR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Resistor Zig-Zag Body
  ctx.strokeStyle = isThermal ? (isConducting ? '#facc15' : '#6b21a8') : '#f59e0b';
  ctx.lineWidth = 2.5;

  const zigH = 6;
  const zigW = 9;
  ctx.beginPath();
  ctx.moveTo(x, y - 36);
  ctx.lineTo(x, y - 24);
  ctx.lineTo(x + zigW, y - 18);
  ctx.lineTo(x - zigW, y - 6);
  ctx.lineTo(x + zigW, y + 6);
  ctx.lineTo(x - zigW, y + 18);
  ctx.lineTo(x + zigW, y + 24);
  ctx.lineTo(x, y + 30);
  ctx.lineTo(x, y + 36);
  ctx.stroke();

  // Label
  ctx.fillStyle = isThermal ? '#fef08a' : '#f59e0b';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${ohms}Ω`, x + 16, y);

  if (isThermal) {
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = parseFloat(tempC) > 100 ? '#f87171' : '#facc15';
    ctx.fillText(`[+] ${tempC}°C MAX`, x + 16, y + 16);
  }

  ctx.restore();
}

function drawLED(ctx, x, y, isRunning, brightness, isOvercurrent, spec, isThermal, tempC) {
  ctx.save();

  // Thermal mode junction heating
  if (isThermal && isRunning) {
    const tempNum = parseFloat(tempC);
    const ledBloomGrad = ctx.createRadialGradient(x, y, 2, x, y, 35);
    ledBloomGrad.addColorStop(0, '#f43f5e');
    ledBloomGrad.addColorStop(0.5, '#a855f7');
    ledBloomGrad.addColorStop(1, 'rgba(76, 29, 149, 0)');
    ctx.fillStyle = ledBloomGrad;
    ctx.beginPath();
    ctx.arc(x, y, 35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radial Photonic Glow
  if (isRunning && brightness > 0 && !isOvercurrent && !isThermal) {
    const glowRadius = 38 * brightness;
    const grad = ctx.createRadialGradient(x, y, 4, x, y, glowRadius);
    grad.addColorStop(0, spec.glowHex);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Diode Symbol
  const triW = 12;
  const triH = 14;

  ctx.fillStyle = isRunning && brightness > 0 ? (isThermal ? '#f43f5e' : spec.colorHex) : '#334155';
  ctx.strokeStyle = isThermal ? '#c084fc' : '#94a3b8';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x + triH, y - triW);
  ctx.lineTo(x + triH, y + triW);
  ctx.lineTo(x - triH, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - triH, y - triW);
  ctx.lineTo(x - triH, y + triW);
  ctx.stroke();

  // Light Emitting Arrows
  ctx.strokeStyle = isRunning && brightness > 0 ? (isThermal ? '#fb7185' : spec.colorHex) : '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 16);
  ctx.lineTo(x - 12, y - 28);
  ctx.moveTo(x + 6, y - 14);
  ctx.lineTo(x - 4, y - 26);
  ctx.stroke();

  // Thermal Reticle on LED
  if (isThermal) {
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`[+] ${tempC}°C`, x, y + 26);
  }

  ctx.restore();
}

function drawTinkercadExplosion(ctx, x, y, smokeRef) {
  ctx.save();
  const spikes = 12;
  const outerR = 36;
  const innerR = 18;
  ctx.beginPath();
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;

  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'black 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POOF!', x, y + 4);

  if (Math.random() < 0.25) {
    smokeRef.current.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 20,
      size: 6,
      opacity: 0.8
    });
  }

  smokeRef.current.forEach((s) => {
    s.y -= 1.2;
    s.size += 0.3;
    s.opacity -= 0.02;

    ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0, s.opacity)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });

  smokeRef.current = smokeRef.current.filter((s) => s.opacity > 0);
  ctx.restore();
}

function drawProbeNodes(ctx, left, right, top, bottom, width, height, activeProbe, spec, isThermal) {
  const nodes = [
    { id: 'vcc', x: left, y: top, label: '+9.00V (VCC)' },
    { id: 'node2', x: right, y: top, label: '+9.00V (SW OUT)' },
    { id: 'node3', x: width * 0.58, y: bottom, label: `+${spec.vf}V (LED ANODE)` }
  ];

  nodes.forEach((n) => {
    const isActive = activeProbe === n.id;
    ctx.save();
    ctx.beginPath();
    ctx.arc(n.x, n.y, isActive ? 8 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#ef4444' : isThermal ? '#a855f7' : '#38bdf8';
    ctx.shadowColor = isActive ? '#ef4444' : '#0ea5e9';
    ctx.shadowBlur = isActive ? 12 : 4;
    ctx.fill();

    if (isActive) {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.fillRect(n.x - 45, n.y - 30, 90, 20);
      ctx.strokeRect(n.x - 45, n.y - 30, 90, 20);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y - 16);
    }
    ctx.restore();
  });
}

function drawFlirHud(ctx, width, height, tempR, tempLed) {
  ctx.save();

  // Top OSD Banner
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('FLIR IR VISION • IRONBOW • e=0.95 • 60Hz', 15, 20);

  // Right Side Thermal Calibration Color Bar
  const barX = width - 24;
  const barY = 40;
  const barW = 10;
  const barH = height - 80;

  const barGrad = ctx.createLinearGradient(0, barY, 0, barY + barH);
  barGrad.addColorStop(0, '#ffffff'); // 150°C
  barGrad.addColorStop(0.2, '#facc15'); // 100°C
  barGrad.addColorStop(0.45, '#ea580c'); // 65°C
  barGrad.addColorStop(0.7, '#c026d3'); // 40°C
  barGrad.addColorStop(1, '#1e1b4b'); // 24°C

  ctx.fillStyle = barGrad;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Temperature Labels on Calibration Bar
  ctx.font = '8px monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'right';
  ctx.fillText('150°C', barX - 4, barY + 8);
  ctx.fillText('100°C', barX - 4, barY + barH * 0.25);
  ctx.fillText('60°C', barX - 4, barY + barH * 0.55);
  ctx.fillText('24°C', barX - 4, barY + barH);

  ctx.restore();
}

function drawDigitalLogicSimulation(
  ctx,
  width,
  height,
  logicA,
  logicB,
  logicC,
  gateOutput,
  isConducting,
  hasUnbridgedGaps,
  uncertainGaps,
  bridgedGaps,
  spec,
  t,
  isThermalMode,
  components,
  simulation
) {
  ctx.save();

  const gateComps = components?.filter(c => c.type?.includes('gate') || c.type === 'digital_ic') || [];
  const gateResults = simulation?.gate_results || {};
  const isMultiGate = gateComps.length >= 2;

  if (isMultiGate) {
    // ==========================================
    // MULTI-GATE COMBINATIONAL LOGIC LAYOUT
    // ==========================================
    const inAx = 70;
    const inAy = height * 0.22;
    const inBx = 70;
    const inBy = height * 0.44;
    const inCx = 70;
    const inCy = height * 0.72;

    const gate1X = width * 0.36;
    const gate1Y = height * 0.33;
    const gate2X = width * 0.36;
    const gate2Y = height * 0.72;
    const gate3X = width * 0.62;
    const gate3Y = height * 0.50;

    const resX = width * 0.80;
    const resY = height * 0.50;
    const ledX = width * 0.92;
    const ledY = height * 0.50;

    const g1Type = gateComps[0]?.properties?.gate_type || 'xor';
    const g1Label = gateComps[0]?.label || 'Gate U1';
    const out1 = gateResults['U1']?.out ?? (g1Type === 'xor' ? (logicA ^ logicB) : (logicA & logicB));

    const g2Type = gateComps[1]?.properties?.gate_type || 'not';
    const g2Label = gateComps[1]?.label || 'Gate U2';
    const out2 = gateResults['U2']?.out ?? (g2Type === 'not' ? (1 - logicC) : (logicC & 1));

    const g3Type = gateComps[2]?.properties?.gate_type || 'or';
    const g3Label = gateComps[2]?.label || 'Gate U3';

    // 1. Wires to Gate 1 (In A & In B)
    drawSignalWire(ctx, inAx + 20, inAy, gate1X - 45, gate1Y - 16, logicA === 1 && isConducting);
    drawSignalWire(ctx, inBx + 20, inBy, gate1X - 45, gate1Y + 16, logicB === 1 && isConducting);

    // 2. Wire to Gate 2 (In C)
    drawSignalWire(ctx, inCx + 20, inCy, gate2X - 35, gate2Y, logicC === 1 && isConducting);

    // 3. Wires from Gate 1 & 2 into Gate 3
    drawSignalWire(ctx, gate1X + 35, gate1Y, gate3X - 45, gate3Y - 16, out1 === 1 && isConducting);
    drawSignalWire(ctx, gate2X + 25, gate2Y, gate3X - 45, gate3Y + 16, out2 === 1 && isConducting);

    // 4. Output Wire from Gate 3 to Resistor & LED
    drawSignalWire(ctx, gate3X + 35, gate3Y, resX - 22, resY, gateOutput === 1 && isConducting);
    drawSignalWire(ctx, resX + 22, resY, ledX - 18, ledY, gateOutput === 1 && isConducting);

    // 5. Draw Interactive Input Pills
    drawLogicInputTerminal(ctx, inAx, inAy, 'INPUT A', logicA, isConducting);
    drawLogicInputTerminal(ctx, inBx, inBy, 'INPUT B', logicB, isConducting);
    drawLogicInputTerminal(ctx, inCx, inCy, 'INPUT C', logicC, isConducting);

    // 6. Draw Gates
    drawAnsiGate(ctx, g1Type, gate1X, gate1Y, isConducting, out1, g1Label, g1Type.toUpperCase());
    drawAnsiGate(ctx, g2Type, gate2X, gate2Y, isConducting, out2, g2Label, g2Type.toUpperCase());
    drawAnsiGate(ctx, g3Type, gate3X, gate3Y, isConducting, gateOutput, g3Label, g3Type.toUpperCase());

    // 7. Draw Resistor & LED
    drawResistor(ctx, resX, resY, 330, isThermalMode, '24.5', isConducting);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('330Ω', resX, resY + 28);

    drawLED(ctx, ledX, ledY, isConducting && gateOutput === 1, gateOutput ? 1.0 : 0.0, false, spec, isThermalMode, '25.0');
    ctx.fillStyle = gateOutput === 1 ? '#34d399' : '#64748b';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gateOutput === 1 ? 'Y: 5V (HIGH)' : 'Y: 0V (LOW)', ledX, ledY + 32);

    // 8. Animated Pulses
    if (isConducting && gateOutput === 1) {
      const pulseOffset = (t * 35) % 50;
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#34d399';
      ctx.beginPath();
      ctx.arc(resX + 22 + (pulseOffset % Math.max(10, ledX - 18 - resX - 22)), resY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Truth Table HUD
    drawCombinationalTruthTable(ctx, width - 165, 15, logicA, logicB, logicC, gateOutput, simulation?.chip_model);

    // 10. Specs HUD
    drawDigitalSpecsHud(ctx, 18, height - 60, logicA, logicB, gateOutput, isConducting, simulation?.chip_model);
  } else {
    // ==========================================
    // SINGLE GATE CIRCUIT LAYOUT
    // ==========================================
    const inAx = 80;
    const inAy = height * 0.35;
    const inBx = 80;
    const inBy = height * 0.65;

    const gateX = width * 0.44;
    const gateY = height * 0.50;

    const resX = width * 0.70;
    const resY = height * 0.50;

    const ledX = width * 0.88;
    const ledY = height * 0.50;

    const gType = gateComps[0]?.properties?.gate_type || 'and';
    const gLabel = gateComps[0]?.label || 'Gate U1';

    // Input wires
    drawSignalWire(ctx, inAx + 20, inAy, gateX - 45, gateY - 18, logicA === 1 && isConducting);
    drawSignalWire(ctx, inBx + 20, inBy, gateX - 45, gateY + 18, logicB === 1 && isConducting);

    // Draw Input Pills
    drawLogicInputTerminal(ctx, inAx, inAy, 'INPUT A', logicA, isConducting);
    drawLogicInputTerminal(ctx, inBx, inBy, 'INPUT B', logicB, isConducting);

    // Draw Gate
    drawAnsiGate(ctx, gType, gateX, gateY, isConducting, gateOutput, gLabel, gType.toUpperCase());

    // Output wires
    drawSignalWire(ctx, gateX + 35, gateY, resX - 22, resY, gateOutput === 1 && isConducting);
    drawSignalWire(ctx, resX + 22, resY, ledX - 18, ledY, gateOutput === 1 && isConducting);

    // Draw Resistor & LED
    drawResistor(ctx, resX, resY, 330, isThermalMode, '24.5', isConducting);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('330Ω PULL-UP', resX, resY + 28);

    drawLED(ctx, ledX, ledY, isConducting && gateOutput === 1, gateOutput ? 1.0 : 0.0, false, spec, isThermalMode, '25.0');
    ctx.fillStyle = gateOutput === 1 ? '#34d399' : '#64748b';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gateOutput === 1 ? 'OUTPUT: HIGH (5V)' : 'OUTPUT: LOW (0V)', ledX, ledY + 32);

    // Truth Table HUD
    drawTruthTableHud(ctx, width - 155, 18, logicA, logicB, gateOutput, gType);

    // Specs HUD
    drawDigitalSpecsHud(ctx, 18, height - 60, logicA, logicB, gateOutput, isConducting, simulation?.chip_model);
  }

  ctx.restore();
}

function drawSignalWire(ctx, x1, y1, x2, y2, isHigh) {
  ctx.save();
  ctx.strokeStyle = isHigh ? '#00f0ff' : '#334155';
  ctx.shadowColor = isHigh ? '#00f0ff' : 'transparent';
  ctx.shadowBlur = isHigh ? 10 : 0;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  const midX = (x1 + x2) * 0.5;
  ctx.moveTo(x1, y1);
  ctx.lineTo(midX, y1);
  ctx.lineTo(midX, y2);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawLogicInputTerminal(ctx, x, y, label, val, isConducting) {
  ctx.save();
  const isHigh = val === 1;

  ctx.fillStyle = isHigh ? 'rgba(6, 182, 212, 0.2)' : 'rgba(30, 41, 59, 0.6)';
  ctx.strokeStyle = isHigh ? '#06b6d4' : '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - 55, y - 16, 75, 32, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x - 48, y - 2);

  ctx.fillStyle = isHigh ? '#22d3ee' : '#64748b';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(isHigh ? '1 (5.0V)' : '0 (0.0V)', x - 48, y + 11);

  ctx.fillStyle = isHigh ? '#22d3ee' : '#334155';
  ctx.shadowColor = isHigh ? '#22d3ee' : 'transparent';
  ctx.shadowBlur = isHigh ? 8 : 0;
  ctx.beginPath();
  ctx.arc(x + 10, y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawAnsiGate(ctx, type, x, y, isConducting, active, label, sub) {
  if (type === 'xor' || type === 'xor_gate') {
    drawAnsiXorGate(ctx, x, y, isConducting, active, label || '74HC86', sub || 'XOR');
  } else if (type === 'not' || type === 'not_gate') {
    drawAnsiNotGate(ctx, x, y, isConducting, active, label || '74HC04', sub || 'NOT');
  } else if (type === 'or' || type === 'or_gate') {
    drawAnsiOrGate(ctx, x, y, isConducting, active, label || '74HC32', sub || 'OR');
  } else if (type === 'nand' || type === 'nand_gate') {
    drawAnsiNandGate(ctx, x, y, isConducting, active, label || '74HC00', sub || 'NAND');
  } else {
    drawAnsiAndGate(ctx, x, y, isConducting, active, label || '74HC08', sub || 'AND');
  }
}

function drawAnsiAndGate(ctx, x, y, isConducting, gateOutput, label='74HC08', sub='AND') {
  ctx.save();
  const gw = 64;
  const gh = 56;
  const left = x - 40;
  const top = y - gh * 0.5;
  const bottom = y + gh * 0.5;

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + gw * 0.45, top);
  ctx.arc(left + gw * 0.45, y, gh * 0.5, -Math.PI * 0.5, Math.PI * 0.5, false);
  ctx.lineTo(left, bottom);
  ctx.closePath();

  const grad = ctx.createLinearGradient(left, top, left + gw, bottom);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = gateOutput === 1 && isConducting ? '#38bdf8' : '#334155';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = gateOutput === 1 && isConducting ? '#0ea5e9' : 'transparent';
  ctx.shadowBlur = gateOutput === 1 && isConducting ? 10 : 0;
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, left + gw * 0.40, y - 4);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText(sub, left + gw * 0.40, y + 8);

  ctx.restore();
}

function drawAnsiOrGate(ctx, x, y, isConducting, gateOutput, label='74HC32', sub='OR') {
  ctx.save();
  const gw = 64;
  const gh = 56;
  const left = x - 40;
  const top = y - gh * 0.5;
  const bottom = y + gh * 0.5;

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.quadraticCurveTo(left + 14, y, left, bottom);
  ctx.quadraticCurveTo(left + gw * 0.6, bottom - 2, left + gw, y);
  ctx.quadraticCurveTo(left + gw * 0.6, top + 2, left, top);
  ctx.closePath();

  const grad = ctx.createLinearGradient(left, top, left + gw, bottom);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = gateOutput === 1 && isConducting ? '#10b981' : '#334155';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = gateOutput === 1 && isConducting ? '#10b981' : 'transparent';
  ctx.shadowBlur = gateOutput === 1 && isConducting ? 10 : 0;
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, left + gw * 0.42, y - 4);
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText(sub, left + gw * 0.42, y + 8);

  ctx.restore();
}

function drawAnsiXorGate(ctx, x, y, isConducting, gateOutput, label='74HC86', sub='XOR') {
  ctx.save();
  const gw = 64;
  const gh = 56;
  const left = x - 38;
  const top = y - gh * 0.5;
  const bottom = y + gh * 0.5;

  ctx.beginPath();
  ctx.moveTo(left - 8, top);
  ctx.quadraticCurveTo(left + 6, y, left - 8, bottom);
  ctx.strokeStyle = gateOutput === 1 && isConducting ? '#c084fc' : '#334155';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.quadraticCurveTo(left + 14, y, left, bottom);
  ctx.quadraticCurveTo(left + gw * 0.6, bottom - 2, left + gw, y);
  ctx.quadraticCurveTo(left + gw * 0.6, top + 2, left, top);
  ctx.closePath();

  const grad = ctx.createLinearGradient(left, top, left + gw, bottom);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = gateOutput === 1 && isConducting ? '#c084fc' : '#334155';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = gateOutput === 1 && isConducting ? '#c084fc' : 'transparent';
  ctx.shadowBlur = gateOutput === 1 && isConducting ? 10 : 0;
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, left + gw * 0.42, y - 4);
  ctx.fillStyle = '#c084fc';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText(sub, left + gw * 0.42, y + 8);

  ctx.restore();
}

function drawAnsiNotGate(ctx, x, y, isConducting, gateOutput, label='74HC04', sub='NOT') {
  ctx.save();
  const gw = 50;
  const gh = 46;
  const left = x - 30;
  const top = y - gh * 0.5;
  const bottom = y + gh * 0.5;

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + gw - 10, y);
  ctx.lineTo(left, bottom);
  ctx.closePath();

  const grad = ctx.createLinearGradient(left, top, left + gw, bottom);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = gateOutput === 1 && isConducting ? '#fbbf24' : '#334155';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = gateOutput === 1 && isConducting ? '#fbbf24' : 'transparent';
  ctx.shadowBlur = gateOutput === 1 && isConducting ? 10 : 0;
  ctx.stroke();

  // Inversion bubble
  ctx.beginPath();
  ctx.arc(left + gw - 4, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#090d16';
  ctx.fill();
  ctx.strokeStyle = gateOutput === 1 && isConducting ? '#fbbf24' : '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, left + 16, y - 3);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 7px sans-serif';
  ctx.fillText(sub, left + 16, y + 7);

  ctx.restore();
}

function drawAnsiNandGate(ctx, x, y, isConducting, gateOutput, label='74HC00', sub='NAND') {
  drawAnsiAndGate(ctx, x, y, isConducting, gateOutput, label, sub);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + 28, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#090d16';
  ctx.fill();
  ctx.strokeStyle = gateOutput === 1 && isConducting ? '#38bdf8' : '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawCombinationalTruthTable(ctx, x, y, a, b, c, yOut, chipModel) {
  ctx.save();
  const w = 155;
  const h = 100;

  ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 22, [8, 8, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('COMBINATIONAL TRUTH TABLE', x + w * 0.5, y + 14);

  const rows = [
    { ra: 0, rb: 0, rc: 0, ry: 0 },
    { ra: 1, rb: 0, rc: 1, ry: 0 },
    { ra: 1, rb: 1, rc: 0, ry: 1 },
    { ra: 1, rb: 1, rc: 1, ry: 1 }
  ];

  rows.forEach((r, idx) => {
    const rowY = y + 36 + idx * 15;
    const isActive = (r.ra === a && r.rb === b && r.rc === c);

    if (isActive) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.fillRect(x + 4, rowY - 10, w - 8, 14);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 9px monospace';
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
    }

    ctx.textAlign = 'left';
    ctx.fillText(` A:${r.ra} B:${r.rb} C:${r.rc} → Y:${r.ry}`, x + 8, rowY);
    if (isActive) {
      ctx.fillText('◄', x + w - 16, rowY);
    }
  });

  ctx.restore();
}

function drawTruthTableHud(ctx, x, y, a, b, yOut, gateType='and') {
  ctx.save();
  const w = 145;
  const h = 100;

  ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 22, [8, 8, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${gateType.toUpperCase()} TRUTH TABLE`, x + w * 0.5, y + 14);

  const getExpected = (ra, rb) => {
    if (gateType === 'xor') return ra ^ rb;
    if (gateType === 'or') return ra | rb;
    if (gateType === 'nand') return 1 - (ra & rb);
    if (gateType === 'not') return 1 - ra;
    return ra & rb;
  };

  const rows = [
    { ra: 0, rb: 0, ry: getExpected(0, 0) },
    { ra: 0, rb: 1, ry: getExpected(0, 1) },
    { ra: 1, rb: 0, ry: getExpected(1, 0) },
    { ra: 1, rb: 1, ry: getExpected(1, 1) }
  ];

  rows.forEach((r, idx) => {
    const rowY = y + 36 + idx * 15;
    const isActive = (r.ra === a && r.rb === b);

    if (isActive) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(x + 4, rowY - 10, w - 8, 14);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 9px monospace';
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
    }

    ctx.textAlign = 'left';
    ctx.fillText(` A:${r.ra}   B:${r.rb}  →  Y:${r.ry}`, x + 12, rowY);
    if (isActive) {
      ctx.fillText('◄', x + w - 18, rowY);
    }
  });

  ctx.restore();
}

function drawDigitalSpecsHud(ctx, x, y, a, b, yOut, isConducting, chipModel) {
  ctx.save();
  const w = 240;
  const h = 50;

  ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`⚡ ${chipModel || 'TTL 5V LOGIC ENGINE'}`, x + 10, y + 16);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px monospace';
  ctx.fillText(`Propagation Delay: 4.2 ns | I_CC: ${yOut === 1 && isConducting ? '18.2' : '1.2'} mA`, x + 10, y + 34);

  ctx.restore();
}
