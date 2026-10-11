import React, { useRef, useEffect, useState } from 'react';
import { Cpu, Power, Play, Pause, Activity, Zap, Maximize2, RotateCcw, AlertTriangle, Flame, ShieldAlert, Sparkles, Sliders } from 'lucide-react';
import { circuitAudio } from '../utils/audio';
import { LED_SPECS } from './LEDColorPicker';

export default function BreadboardView({
  resistance = 330,
  voltage = 9.0,
  simulation,
  components = [],
  switchState = 'closed',
  onToggleSwitch,
  ledColor = 'green',
  onVoltageChange,
  onResistanceChange,
  onSelectColor,
  onBridgeAllGaps,
  onLoadPreset,
  uncertainGaps = [],
  bridgedGaps = [],
  hasSketch = false,
  logicInputs = { a: 1, b: 1 },
  onToggleLogicPin,
  connections = []
}) {
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);
  const waveformRef = useRef([]);
  const smokeParticlesRef = useRef([]);

  // Local Master Power Supply Toggle on the Benchtop Chassis
  const [powerSupplyOn, setPowerSupplyOn] = useState(true);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);

  const [activeChannelA, setActiveChannelA] = useState(true);
  const [activeChannelB, setActiveChannelB] = useState(true);

  const spec = LED_SPECS[ledColor] || LED_SPECS.green;

  const isDigital = simulation?.circuit_type === 'DIGITAL_LOGIC'
    || components?.some(c => c.type?.includes('gate') || c.type === 'digital_ic')
    || connections?.some(c => c.id?.includes('IC') || c.id?.includes('GATE') || c.id?.includes('COMP'));
  const logicA = logicInputs?.a ?? 1;
  const logicB = logicInputs?.b ?? 1;
  const logicC = logicInputs?.c ?? 1;

  // Check if hand-drawn sketch has open uncertainty gaps
  const hasUnbridgedGaps = hasSketch && uncertainGaps.length > 0 && bridgedGaps.length < uncertainGaps.length;
  const isClosedLoop = hasSketch ? Boolean(simulation?.is_closed_loop) : false;
  const isConducting = hasSketch && powerSupplyOn && switchState === 'closed' && isClosedLoop && !hasUnbridgedGaps;

  // Gate output logic dynamically computed from backend simulation
  const gateOutput = isConducting ? (simulation?.logic_output ?? (logicA === 1 && logicB === 1 ? 1 : 0)) : 0;

  // Real physical current from backend MNA or sandbox fallback
  const displayVoltage = hasSketch ? (isDigital ? 5.00 : voltage) : 0.00;
  const currentMa = isConducting
    ? (isDigital
        ? (gateOutput === 1 ? 18.2 : 1.2)
        : (simulation?.current_ma ?? Math.max(0, ((voltage - spec.vf) / resistance) * 1000)))
    : 0.0;
  const resistorVoltage = isConducting
    ? (isDigital ? (gateOutput === 1 ? 4.85 : 0.0) : (simulation?.resistor_voltage_v ?? Math.max(0, voltage - spec.vf)))
    : 0.0;
  const isOvercurrent = hasSketch && !isDigital && isConducting && currentMa > 30.0;

  // Fixed 3D Geometric Anchor Points (matched perfectly across the canvas)
  const psX = 45;
  const psY = 115;
  const redPost = { x: psX + 135, y: psY + 115 }; // (180, 230)
  const blackPost = { x: psX + 85, y: psY + 125 }; // (130, 240)

  const bx = 420;
  const by = 220;
  const redRail = { x: bx - 100, y: by + 68 }; // (320, 288)
  const blueRail = { x: bx - 85, y: by + 75 };  // (335, 295)

  const swPos = { x: bx + 15, y: by + 50 };     // (435, 270)
  const capPos = { x: bx + 65, y: by + 30 };    // (485, 250)
  const ledPos = { x: bx + 105, y: by + 20 };   // (525, 240)
  const resPos = { x: bx + 175, y: by + 45 };   // (595, 265)
  const torPos = { x: bx + 245, y: by + 30 };   // (665, 250)

  // Particle positions along the circuit loop
  const particlesRef = useRef(
    Array.from({ length: 22 }, (_, i) => ({ progress: i / 22 }))
  );

  // Trigger burnout buzzer on overcurrent
  useEffect(() => {
    if (isOvercurrent) {
      circuitAudio.playBurnoutPop();
    }
  }, [isOvercurrent]);

  // Main 60 FPS 3D Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let t = 0;

    const render = () => {
      t += 0.04;
      const w = canvas.width;
      const h = canvas.height;

      // Update Oscilloscope Waveform History
      if (isConducting) {
        const valA = resistorVoltage + (Math.sin(t * 3.5) * 0.15) + (Math.random() - 0.5) * 0.05;
        const valB = (currentMa / 21.21) * 4.5 + (Math.sin(t * 3.5 + 1.2) * 0.12);
        waveformRef.current.push({ a: valA, b: valB });
      } else {
        waveformRef.current.push({ a: 0.0, b: 0.0 });
      }
      if (waveformRef.current.length > 180) {
        waveformRef.current.shift();
      }

      // Update Smoke Particles on Overcurrent
      if (isOvercurrent) {
        if (Math.random() < 0.4) {
          smokeParticlesRef.current.push({
            x: ledPos.x + (Math.random() - 0.5) * 12,
            y: ledPos.y - 25,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -1.2 - Math.random() * 0.8,
            size: 4 + Math.random() * 4,
            opacity: 0.8
          });
        }
      }
      smokeParticlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.size += 0.2;
        p.opacity -= 0.02;
      });
      smokeParticlesRef.current = smokeParticlesRef.current.filter((p) => p.opacity > 0);

      // 1. Dark Lab Workbench Desk Background (CRUMB 3D Style)
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 50, w * 0.5, h * 0.5, w * 0.7);
      bgGrad.addColorStop(0, '#131b2a');
      bgGrad.addColorStop(0.6, '#0a0f18');
      bgGrad.addColorStop(1, '#05070c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Perspective Grid Lines on Desk
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const vanishingY = h * 0.15;
      for (let x = -200; x <= w + 200; x += 55) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + (x - w * 0.5) * 0.3, vanishingY);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // 2. Draw 3D DC Benchtop Power Supply
      draw3DPowerSupply(ctx, psX, psY, displayVoltage, currentMa, powerSupplyOn, isConducting);

      // 3. Draw 3D Isometric Solderless Breadboard
      draw3DBreadboardChassis(ctx, bx, by);

      // 4. Draw Banana Cables (Precisely connected from posts into breadboard)
      drawBananaCables(ctx, redPost, blackPost, redRail, blueRail, bx, by);

      // 5. Draw Breadboard Components (or Standby Hologram if no sketch loaded)
      if (!hasSketch) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx - 40, by + 10, 360, 85, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ 3D BREADBOARD DIGITAL TWIN (STANDBY)', bx + 140, by + 42);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Awaiting circuit sketch — upload a photo or select a sample sketch', bx + 140, by + 65);
        ctx.restore();
      } else if (isDigital) {
        // (A) 14-Pin DIP IC across breadboard trough matching detected gate model
        const chipLabel = simulation?.chip_model?.includes('86') ? '74HC86N'
          : (simulation?.chip_model?.includes('04') ? '74HC04N'
          : (simulation?.chip_model?.includes('32') ? '74HC32N'
          : (simulation?.chip_model?.includes('00') ? '74HC00N'
          : (simulation?.chip_model?.includes('02') ? '74HC02N' : '74HC08N'))));
        draw3DDip14Chip(ctx, bx + 70, by + 45, chipLabel);

        // (B) Digital Logic Jumpers
        drawDigitalBreadboardJumpers(ctx, redRail, blueRail, bx, by, logicA, logicB, gateOutput, isConducting);

        // (C) Input A & Input B Tactile Switches on Breadboard
        draw3DInputToggleSwitch(ctx, bx - 15, by + 65, logicA, hoveredHotspot === 'logicA', 'A');
        draw3DInputToggleSwitch(ctx, bx + 15, by + 85, logicB, hoveredHotspot === 'logicB', 'B');

        // (D) Pull-Up / Current Limiting Resistor
        draw3DResistor(ctx, bx + 175, by + 45, 330);

        // (E) Output Status LED
        draw3DGlowingLED(ctx, bx + 235, by + 30, spec, isConducting && gateOutput === 1, false, t, hoveredHotspot === 'led');

        // (F) Digital Electron Packets
        if (isConducting && gateOutput === 1) {
          drawDigitalElectrons(ctx, particlesRef.current, redPost, blackPost, redRail, blueRail, bx, by);
        }
      } else {
        // (A) Tactile Pushbutton Switch
        draw3DTactileSwitch(ctx, swPos.x, swPos.y, switchState, hoveredHotspot === 'switch');

        // (B) Electrolytic Filter Capacitor
        draw3DCapacitor(ctx, capPos.x, capPos.y);

        // (C) Resistor with Real EIA 4-Band Color Codes
        draw3DResistor(ctx, resPos.x, resPos.y, resistance);

        // (D) Toroidal Inductor Coil
        draw3DToroid(ctx, torPos.x, torPos.y);

        // (E) 3D Translucent Glowing LED with Radial Floor Reflection
        draw3DGlowingLED(ctx, ledPos.x, ledPos.y, spec, isConducting, isOvercurrent, t, hoveredHotspot === 'led');

        // (F) Breadboard Jumpers
        drawBreadboardJumpers(ctx, redRail, swPos, ledPos, resPos, blueRail, isConducting);

        // 6. Draw 60 FPS Animated Flowing Electron Dots along the Circuit
        if (isConducting && currentMa > 0.5) {
          drawFlowingElectrons(ctx, particlesRef.current, currentMa, redPost, blackPost, redRail, blueRail, swPos, ledPos, resPos, bx, by);
        }
      }

      // 7. Draw Cartoon Smoke Puffs on Overcurrent
      if (isOvercurrent) {
        drawSmokePuffs(ctx, smokeParticlesRef.current);
      }

      // 8. Draw Floating In-Set Oscilloscope Monitor (CRUMB / Rigol Style)
      drawFloatingScope(ctx, 25, h - 175, waveformRef.current, activeChannelA, activeChannelB, spec, displayVoltage, currentMa, isConducting);

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId.current);
  }, [
    voltage, resistance, simulation, switchState, powerSupplyOn, isConducting,
    currentMa, resistorVoltage, isOvercurrent, spec, hoveredHotspot,
    activeChannelA, activeChannelB, isDigital, logicA, logicB, gateOutput, displayVoltage
  ]);

  // Handle Canvas Mouse Clicks on 3D Hotspots
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Power switch hotspot (common)
    const pwrSwitchX = psX + 65;
    const pwrSwitchY = psY + 82;
    const distPwr = Math.hypot(clickX - pwrSwitchX, clickY - pwrSwitchY);
    if (distPwr < 22) {
      circuitAudio.playSwitchClick(!powerSupplyOn);
      setPowerSupplyOn(!powerSupplyOn);
      return;
    }

    if (isDigital) {
      // Hotspot: Input Switch A
      if (Math.hypot(clickX - (bx - 15), clickY - (by + 65)) < 24) {
        if (onToggleLogicPin) onToggleLogicPin('a');
        return;
      }
      // Hotspot: Input Switch B
      if (Math.hypot(clickX - (bx + 15), clickY - (by + 85)) < 24) {
        if (onToggleLogicPin) onToggleLogicPin('b');
        return;
      }
      // Hotspot: LED
      if (Math.hypot(clickX - (bx + 235), clickY - (by + 15)) < 24) {
        const colors = ['green', 'red', 'blue', 'yellow', 'purple'];
        const nextIdx = (colors.indexOf(ledColor) + 1) % colors.length;
        circuitAudio.playProbeBeep(1400);
        if (onSelectColor) onSelectColor(colors[nextIdx]);
        return;
      }
    } else {
      // Hotspot 1: Tactile Pushbutton Switch on Breadboard
      const distSw = Math.hypot(clickX - swPos.x, clickY - swPos.y);
      if (distSw < 24) {
        if (onToggleSwitch) onToggleSwitch();
        return;
      }

      // Hotspot 3: 3D LED Dome (Click to Cycle Colors!)
      const distLed = Math.hypot(clickX - ledPos.x, clickY - (ledPos.y - 15));
      if (distLed < 24) {
        const colors = ['green', 'red', 'blue', 'yellow', 'purple'];
        const nextIdx = (colors.indexOf(ledColor) + 1) % colors.length;
        circuitAudio.playProbeBeep(1400);
        if (onSelectColor) onSelectColor(colors[nextIdx]);
        return;
      }
    }
  };

  // Handle Mouse Move for Hover Indicators & Cursor
  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (isDigital) {
      if (Math.hypot(mouseX - (bx - 15), mouseY - (by + 65)) < 24) {
        setHoveredHotspot('logicA');
        canvas.style.cursor = 'pointer';
      } else if (Math.hypot(mouseX - (bx + 15), mouseY - (by + 85)) < 24) {
        setHoveredHotspot('logicB');
        canvas.style.cursor = 'pointer';
      } else if (Math.hypot(mouseX - (bx + 235), mouseY - (by + 15)) < 24) {
        setHoveredHotspot('led');
        canvas.style.cursor = 'pointer';
      } else if (Math.hypot(mouseX - (psX + 65), mouseY - (psY + 82)) < 22) {
        setHoveredHotspot('power');
        canvas.style.cursor = 'pointer';
      } else {
        setHoveredHotspot(null);
        canvas.style.cursor = 'default';
      }
    } else {
      if (Math.hypot(mouseX - swPos.x, mouseY - swPos.y) < 24) {
        setHoveredHotspot('switch');
        canvas.style.cursor = 'pointer';
      } else if (Math.hypot(mouseX - (psX + 65), mouseY - (psY + 82)) < 22) {
        setHoveredHotspot('power');
        canvas.style.cursor = 'pointer';
      } else if (Math.hypot(mouseX - ledPos.x, mouseY - (ledPos.y - 15)) < 24) {
        setHoveredHotspot('led');
        canvas.style.cursor = 'pointer';
      } else {
        setHoveredHotspot(null);
        canvas.style.cursor = 'default';
      }
    }
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col space-y-3 p-4">
      {/* Top Banner: Status & Uncertainty Gate Alerts */}
      {hasUnbridgedGaps ? (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-950/90 border border-amber-600/80 px-4 py-2.5 rounded-xl text-amber-200 text-xs shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Uncertainty Gate Active:</strong> Paper sketch contains {uncertainGaps.length} unbridged wire gap(s). Current is halted at <strong>0.00 mA</strong>.
            </span>
          </div>
          <button
            onClick={onBridgeAllGaps}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all text-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Bridge Gaps & Ignite LED</span>
          </button>
        </div>
      ) : isOvercurrent ? (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-rose-950/90 border border-rose-600/80 px-4 py-2.5 rounded-xl text-rose-200 text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            <span>
              <strong>Burnout Hazard:</strong> Current is <strong>{currentMa.toFixed(1)} mA</strong> (Exceeds 30.0 mA absolute max)! Smoke and thermal destruction simulated.
            </span>
          </div>
          <button
            onClick={() => onResistanceChange && onResistanceChange(330)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-all shadow-md"
          >
            Reset Resistor to 330Ω
          </button>
        </div>
      ) : !hasSketch ? (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Digital Twin Standby:</strong> No circuit sketch loaded yet. Upload a photo or select a sample sketch above to generate the breadboard wiring.
            </span>
          </div>
          {onLoadPreset && (
            <button
              onClick={onLoadPreset}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
            >
              <Zap className="w-3 h-3" />
              <span>Load Sample Sketch</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-emerald-950/80 border border-emerald-800/80 px-4 py-2 rounded-xl text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>Hand-Drawn Sketch Conductive:</strong> Closed loop verified. Operating normally at <strong>{currentMa.toFixed(1)} mA</strong>.
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700">
            P = {((currentMa * voltage) / 1000).toFixed(1)} W
          </span>
        </div>
      )}

      {/* Interactive Quick Tuner Bar */}
      {isDigital ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs shadow-inner">
          {/* 1. Master Bench Power Supply */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-400 font-medium">TTL Bench Supply:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  circuitAudio.playSwitchClick(!powerSupplyOn);
                  setPowerSupplyOn(!powerSupplyOn);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  powerSupplyOn
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>VCC: {powerSupplyOn ? '5.00V ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* 2. Logic Input A Toggle */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Input A:</span>
              <span className="font-mono font-bold text-cyan-400">{logicA === 1 ? '5V HIGH' : '0V LOW'}</span>
            </div>
            <button
              onClick={() => onToggleLogicPin && onToggleLogicPin('a')}
              className={`w-full py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                logicA === 1
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>Toggle A: [{logicA}]</span>
            </button>
          </div>

          {/* 3. Logic Input B Toggle */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Input B:</span>
              <span className="font-mono font-bold text-cyan-400">{logicB === 1 ? '5V HIGH' : '0V LOW'}</span>
            </div>
            <button
              onClick={() => onToggleLogicPin && onToggleLogicPin('b')}
              className={`w-full py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                logicB === 1
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>Toggle B: [{logicB}]</span>
            </button>
          </div>

          {/* 4. Logic Input C Toggle */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Input C:</span>
              <span className="font-mono font-bold text-cyan-400">{logicC === 1 ? '5V HIGH' : '0V LOW'}</span>
            </div>
            <button
              onClick={() => onToggleLogicPin && onToggleLogicPin('c')}
              className={`w-full py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                logicC === 1
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>Toggle C: [{logicC}]</span>
            </button>
          </div>

          {/* 5. Gate Output & LED Status */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Output Y:</span>
              <span className={`font-mono font-bold ${gateOutput === 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {gateOutput === 1 ? '5.0V (HIGH)' : '0.0V (LOW)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              {['green', 'red', 'blue', 'yellow', 'purple'].map((col) => {
                const cSpec = LED_SPECS[col];
                const isSel = ledColor === col;
                return (
                  <button
                    key={col}
                    onClick={() => onSelectColor && onSelectColor(col)}
                    style={{ backgroundColor: cSpec.colorHex }}
                    className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                      isSel ? 'ring-2 ring-white scale-110 border-white shadow-lg' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                    title={`${cSpec.name} (${cSpec.vf}V)`}
                  />
                );
              })}
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex justify-between items-center pt-0.5">
              <span>Gate: <strong>AND (U1)</strong></span>
              <span>I_CC: <strong>{currentMa.toFixed(1)} mA</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
          {/* 1. Master DC Supply & Tactile Switch */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-400 font-medium">Power & Switch:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  circuitAudio.playSwitchClick(!powerSupplyOn);
                  setPowerSupplyOn(!powerSupplyOn);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  powerSupplyOn
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Click to toggle DC Bench Power Supply"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Supply: {powerSupplyOn ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={onToggleSwitch}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  switchState === 'closed'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Click to toggle Tactile Pushbutton"
              >
                <span>Switch: {switchState === 'closed' ? 'CLOSED' : 'OPEN'}</span>
              </button>
            </div>
          </div>

          {/* 2. Supply Voltage Slider & Quick Presets */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Voltage ($V_s$):</span>
              <span className="font-mono font-bold text-cyan-400">{voltage.toFixed(1)} V</span>
            </div>
            <input
              type="range"
              min="2.5"
              max="15.0"
              step="0.5"
              value={voltage}
              onChange={(e) => onVoltageChange && onVoltageChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex gap-1 justify-between pt-0.5">
              {[3.3, 5.0, 9.0, 12.0].map((v) => (
                <button
                  key={v}
                  onClick={() => onVoltageChange && onVoltageChange(v)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${
                    voltage === v
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {v}V
                </button>
              ))}
            </div>
          </div>

          {/* 3. Resistance Slider & Quick Presets */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Resistor ($R_1$):</span>
              <span className="font-mono font-bold text-amber-400">{resistance} Ω</span>
            </div>
            <input
              type="range"
              min="50"
              max="1500"
              step="25"
              value={resistance}
              onChange={(e) => onResistanceChange && onResistanceChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex gap-1 justify-between pt-0.5">
              {[100, 220, 330, 1000].map((r) => (
                <button
                  key={r}
                  onClick={() => onResistanceChange && onResistanceChange(r)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${
                    resistance === r
                      ? 'bg-amber-950 text-amber-300 border-amber-700 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {r >= 1000 ? '1kΩ' : `${r}Ω`}
                </button>
              ))}
            </div>
          </div>

          {/* 4. LED Color Swatches & Live Telemetry */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">LED Color:</span>
              <span className="font-mono text-[11px] font-semibold" style={{ color: spec.colorHex }}>
                {spec.name} ({spec.vf}V)
              </span>
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              {['green', 'red', 'blue', 'yellow', 'purple'].map((col) => {
                const cSpec = LED_SPECS[col];
                const isSel = ledColor === col;
                return (
                  <button
                    key={col}
                    onClick={() => onSelectColor && onSelectColor(col)}
                    style={{ backgroundColor: cSpec.colorHex }}
                    className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                      isSel ? 'ring-2 ring-white scale-110 border-white shadow-lg' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                    title={`${cSpec.name} (${cSpec.vf}V)`}
                  />
                );
              })}
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex justify-between items-center pt-0.5">
              <span>
                Loop: <strong className={isConducting ? 'text-emerald-400' : 'text-slate-500'}>{isConducting ? 'CLOSED' : 'OPEN'}</strong>
              </span>
              <span>
                Current: <strong className={isOvercurrent ? 'text-rose-400 animate-pulse' : isConducting ? 'text-cyan-400' : 'text-slate-500'}>{currentMa.toFixed(1)} mA</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3D Workbench Canvas Area */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={920}
          height={520}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className="w-full h-auto block select-none"
        />

        {/* Interactive Hover Tooltip */}
        {hoveredHotspot && (
          <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/80 text-[11px] font-mono text-cyan-300 shadow-2xl pointer-events-none animate-fadeIn">
            {hoveredHotspot === 'switch' && '👉 Click to toggle Tactile Pushbutton'}
            {hoveredHotspot === 'power' && '👉 Click to toggle DC Bench Power Supply'}
            {hoveredHotspot === 'led' && '👉 Click to cycle LED color'}
          </div>
        )}

        {/* Right Corner Watermark */}
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-mono text-cyan-400 shadow-lg pointer-events-none">
          Isometric 3D Breadboard Twin • 60 FPS Physics
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3D RENDERING ENGINE & CANVASES
// -------------------------------------------------------------

function draw3DPowerSupply(ctx, x, y, voltage, currentMa, powerSupplyOn, isConducting) {
  ctx.save();
  // Chassis drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  ctx.ellipse(x + 95, y + 165, 105, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3D Left Face of Cabinet
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(x, y + 30);
  ctx.lineTo(x + 40, y);
  ctx.lineTo(x + 40, y + 140);
  ctx.lineTo(x, y + 160);
  ctx.closePath();
  ctx.fill();

  // 3D Front Face
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(x + 40, y);
  ctx.lineTo(x + 175, y + 22);
  ctx.lineTo(x + 175, y + 155);
  ctx.lineTo(x + 40, y + 140);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Digital 7-Segment LED Voltmeter Screen
  ctx.fillStyle = '#090d16';
  ctx.fillRect(x + 55, y + 26, 105, 36);
  ctx.strokeStyle = powerSupplyOn ? '#0284c7' : '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 55, y + 26, 105, 36);

  // Digital Screen Text
  if (powerSupplyOn) {
    ctx.fillStyle = isConducting ? '#38bdf8' : '#0284c7';
    ctx.shadowColor = '#0ea5e9';
    ctx.shadowBlur = isConducting ? 10 : 4;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${voltage.toFixed(2)} V`, x + 62, y + 49);

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = isConducting ? '#10b981' : '#047857';
    ctx.fillText(`${currentMa.toFixed(1)} mA`, x + 115, y + 58);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#0f2942';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('0.00 V', x + 62, y + 49);
    ctx.font = 'bold 10px monospace';
    ctx.fillText('0.0 mA', x + 115, y + 58);
  }

  // Power Rocker Switch (Clickable Hotspot)
  ctx.fillStyle = powerSupplyOn ? '#ef4444' : '#475569';
  ctx.fillRect(x + 55, y + 74, 24, 16);
  ctx.strokeStyle = '#0f172a';
  ctx.strokeRect(x + 55, y + 74, 24, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px monospace';
  ctx.fillText(powerSupplyOn ? 'ON' : 'OFF', x + 58, y + 85);

  // Rotary Knob
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(x + 135, y + 82, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.stroke();
  // Knob notch
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 135, y + 82);
  ctx.lineTo(x + 130, y + 75);
  ctx.stroke();

  // Red Banana Binding Post (+)
  const rPostX = x + 135;
  const rPostY = y + 115;
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(rPostX, rPostY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(rPostX, rPostY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(rPostX, rPostY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Black Banana Binding Post (-)
  const bPostX = x + 85;
  const bPostY = y + 125;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(bPostX, bPostY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(bPostX, bPostY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(bPostX, bPostY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Chassis Nameplate
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('DC BENCH SUPPLY', x + 55, y + 18);

  ctx.restore();
}

function draw3DBreadboardChassis(ctx, bx, by) {
  ctx.save();
  // 1. Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.ellipse(bx + 110, by + 175, 260, 60, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // 2. Plastic Thickness / Side Bevels
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(bx - 140, by + 85);
  ctx.lineTo(bx + 310, by + 10);
  ctx.lineTo(bx + 310, by + 35);
  ctx.lineTo(bx - 140, by + 110);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(bx - 140, by + 110);
  ctx.lineTo(bx + 10, by + 170);
  ctx.lineTo(bx + 10, by + 145);
  ctx.lineTo(bx - 140, by + 85);
  ctx.closePath();
  ctx.fill();

  // Top Surface (Solderless chassis)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(bx - 140, by + 85);
  ctx.lineTo(bx + 160, by - 45);
  ctx.lineTo(bx + 460, by + 35);
  ctx.lineTo(bx + 160, by + 165);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Red & Blue Power Rails (Isometric Lines)
  // Red VCC line
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(bx - 100, by + 68);
  ctx.lineTo(bx + 180, by - 38);
  ctx.stroke();

  // Blue GND line
  ctx.strokeStyle = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(bx - 85, by + 75);
  ctx.lineTo(bx + 195, by - 31);
  ctx.stroke();

  // Pin Sockets Matrix
  ctx.fillStyle = '#475569';
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 18; col++) {
      const hx = bx - 60 + (col * 18) - (row * 6);
      const hy = by + 45 - (col * 5) + (row * 8);
      ctx.fillRect(hx, hy, 2, 2.5);
    }
  }

  ctx.restore();
}

function drawBananaCables(ctx, redPost, blackPost, redRail, blueRail, bx, by) {
  ctx.save();
  ctx.lineCap = 'round';

  // 1. Red Banana Cable (+)
  // 3D Red Plug at Power Supply
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(redPost.x - 3, redPost.y - 2, 8, 12);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(redPost.x - 2, redPost.y, 6, 8);

  // Red Cable Curve
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 4.5;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(redPost.x + 2, redPost.y + 8);
  ctx.bezierCurveTo(
    redPost.x + 35, redPost.y + 95,
    redRail.x - 60, redRail.y + 40,
    redRail.x, redRail.y
  );
  ctx.stroke();

  // Red Pin Plug into Breadboard Rail
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(redRail.x - 2, redRail.y - 6, 5, 8);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(redRail.x - 1, redRail.y, 3, 4);

  // 2. Black Banana Cable (-)
  // 3D Black Plug at Power Supply
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(blackPost.x - 3, blackPost.y - 2, 8, 12);
  ctx.fillStyle = '#334155';
  ctx.fillRect(blackPost.x - 2, blackPost.y, 6, 8);

  // Black Cable Curve
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(blackPost.x + 2, blackPost.y + 8);
  ctx.bezierCurveTo(
    blackPost.x + 25, blackPost.y + 140,
    blueRail.x - 45, blueRail.y + 65,
    blueRail.x, blueRail.y
  );
  ctx.stroke();

  // Black Pin Plug into Breadboard Rail
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(blueRail.x - 2, blueRail.y - 6, 5, 8);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(blueRail.x - 1, blueRail.y, 3, 4);

  ctx.restore();
}

function draw3DTactileSwitch(ctx, x, y, switchState, isHovered) {
  ctx.save();
  // Black square casing
  ctx.fillStyle = isHovered ? '#1e293b' : '#0f172a';
  ctx.fillRect(x - 12, y - 10, 24, 20);
  ctx.strokeStyle = isHovered ? '#38bdf8' : '#334155';
  ctx.lineWidth = isHovered ? 2 : 1;
  ctx.strokeRect(x - 12, y - 10, 24, 20);

  // Round button cap
  const isClosed = switchState === 'closed';
  ctx.fillStyle = isClosed ? '#10b981' : '#64748b';
  ctx.beginPath();
  ctx.arc(x, y - (isClosed ? 0 : 3), 7, 0, Math.PI * 2);
  ctx.fill();

  // Silver metal terminals
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x - 14, y - 4, 3, 8);
  ctx.fillRect(x + 11, y - 4, 3, 8);
  ctx.restore();
}

function draw3DCapacitor(ctx, x, y) {
  ctx.save();
  // Blue cylindrical can
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 9, y - 24, 18, 24);

  // Metallic top vent cap
  ctx.fillStyle = '#93c5fd';
  ctx.beginPath();
  ctx.ellipse(x, y - 24, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Negative polarity stripe
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x + 4, y - 24, 3, 24);
  ctx.restore();
}

function draw3DResistor(ctx, x, y, ohms) {
  ctx.save();
  // Ceramic tan body
  ctx.fillStyle = '#d4b996';
  ctx.beginPath();
  ctx.roundRect(x - 16, y - 6, 32, 12, 4);
  ctx.fill();

  // Calculate Real 4-Band EIA Color Stripes
  const bands = getEiaColorBands(ohms);

  ctx.fillStyle = bands[0];
  ctx.fillRect(x - 10, y - 6, 3, 12);
  ctx.fillStyle = bands[1];
  ctx.fillRect(x - 4, y - 6, 3, 12);
  ctx.fillStyle = bands[2];
  ctx.fillRect(x + 2, y - 6, 3, 12);
  ctx.fillStyle = bands[3];
  ctx.fillRect(x + 8, y - 6, 3, 12);

  // Wire leads
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 16, y);
  ctx.lineTo(x - 26, y + 8);
  ctx.moveTo(x + 16, y);
  ctx.lineTo(x + 26, y + 8);
  ctx.stroke();
  ctx.restore();
}

function getEiaColorBands(ohms) {
  const digits = Math.round(ohms).toString();
  const d1 = parseInt(digits[0], 10);
  const d2 = digits.length > 1 ? parseInt(digits[1], 10) : 0;
  const multiplierPower = digits.length - 2;

  const colors = [
    '#1e293b', // 0 Black
    '#854d0e', // 1 Brown
    '#dc2626', // 2 Red
    '#ea580c', // 3 Orange
    '#eab308', // 4 Yellow
    '#10b981', // 5 Green
    '#3b82f6', // 6 Blue
    '#a855f7', // 7 Violet
    '#64748b', // 8 Gray
    '#f8fafc'  // 9 White
  ];

  const band1 = colors[d1] || colors[1];
  const band2 = colors[d2] || colors[0];
  const multIndex = Math.max(0, Math.min(9, multiplierPower));
  const band3 = colors[multIndex];
  const band4 = '#f59e0b'; // Gold ±5% tolerance

  return [band1, band2, band3, band4];
}

function draw3DToroid(ctx, x, y) {
  ctx.save();
  // Copper coiled ring
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 12, -0.2, 0, Math.PI * 2);
  ctx.stroke();

  // Individual copper windings
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const px = x + Math.cos(ang) * 16;
    const py = y + Math.sin(ang) * 12;
    ctx.beginPath();
    ctx.moveTo(px - 3, py - 4);
    ctx.lineTo(px + 3, py + 4);
    ctx.stroke();
  }
  ctx.restore();
}

function draw3DGlowingLED(ctx, x, y, spec, isConducting, isOvercurrent, t, isHovered) {
  ctx.save();

  // 1. 3D Radial Glow on Floor Surface (CRUMB signature light effect!)
  if (isConducting) {
    const pulse = isOvercurrent ? Math.sin(t * 18) * 8 : Math.sin(t * 6) * 3;
    const glowRadius = Math.max(25, (isOvercurrent ? 80 : 60) + pulse);
    const floorGlow = ctx.createRadialGradient(x, y + 10, 4, x, y + 10, glowRadius);
    floorGlow.addColorStop(0, spec.glowColor);
    floorGlow.addColorStop(0.5, spec.glowColor.replace('0.8', '0.25'));
    floorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floorGlow;
    ctx.beginPath();
    ctx.ellipse(x, y + 10, glowRadius, glowRadius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Metal Leads into Breadboard
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 5);
  ctx.lineTo(x - 12, y + 12);
  ctx.moveTo(x + 6, y - 5);
  ctx.lineTo(x + 12, y + 12);
  ctx.stroke();

  // 3. Translucent Epoxy Dome Bulb
  const bulbGrad = ctx.createLinearGradient(x - 12, y - 35, x + 12, y);
  if (isOvercurrent) {
    // Overcurrent blinding white-hot flare
    bulbGrad.addColorStop(0, '#ffffff');
    bulbGrad.addColorStop(0.4, '#fef08a');
    bulbGrad.addColorStop(1, spec.colorHex);
  } else if (isConducting) {
    bulbGrad.addColorStop(0, '#ffffff');
    bulbGrad.addColorStop(0.3, spec.colorHex);
    bulbGrad.addColorStop(1, spec.colorHex);
  } else {
    bulbGrad.addColorStop(0, '#64748b');
    bulbGrad.addColorStop(1, '#1e293b');
  }

  ctx.fillStyle = bulbGrad;
  ctx.beginPath();
  ctx.arc(x, y - 18, 11, Math.PI, 0, false);
  ctx.lineTo(x + 11, y - 5);
  ctx.arc(x, y - 5, 11, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();

  if (isHovered) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Specular Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(x - 3, y - 22, 3, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBreadboardJumpers(ctx, redRail, swPos, ledPos, resPos, blueRail, isConducting) {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  // Jumper 1: Red Rail -> Tactile Switch
  ctx.strokeStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(redRail.x, redRail.y);
  ctx.bezierCurveTo(redRail.x + 40, redRail.y + 15, swPos.x - 30, swPos.y + 15, swPos.x - 12, swPos.y);
  ctx.stroke();

  // Jumper 2: Tactile Switch -> LED Anode (Blue Wire)
  ctx.strokeStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(swPos.x + 12, swPos.y);
  ctx.bezierCurveTo(swPos.x + 40, swPos.y - 20, ledPos.x - 40, ledPos.y - 15, ledPos.x - 12, ledPos.y + 12);
  ctx.stroke();

  // Jumper 3: LED Cathode -> Resistor (Green Wire)
  ctx.strokeStyle = '#16a34a';
  ctx.beginPath();
  ctx.moveTo(ledPos.x + 12, ledPos.y + 12);
  ctx.bezierCurveTo(ledPos.x + 30, ledPos.y + 35, resPos.x - 40, resPos.y + 25, resPos.x - 26, resPos.y + 8);
  ctx.stroke();

  // Jumper 4: Resistor -> Blue GND Rail (Black Wire)
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(resPos.x + 26, resPos.y + 8);
  ctx.bezierCurveTo(resPos.x + 45, resPos.y + 25, blueRail.x + 60, blueRail.y + 20, blueRail.x, blueRail.y);
  ctx.stroke();

  ctx.restore();
}

// Draw 60 FPS Animated Flowing Electron Dots along the Circuit Loop
function drawFlowingElectrons(ctx, particles, currentMa, redPost, blackPost, redRail, blueRail, swPos, ledPos, resPos, bx, by) {
  ctx.save();
  const speed = Math.min(0.008, Math.max(0.001, (currentMa / 21.21) * 0.0035));

  // Key waypoints in circuit order
  // Seg 0: Red cable: redPost -> redRail
  // Seg 1: redRail -> switch
  // Seg 2: switch -> LED
  // Seg 3: LED -> Resistor
  // Seg 4: Resistor -> blueRail
  // Seg 5: Black cable: blueRail -> blackPost

  particles.forEach((p) => {
    p.progress = (p.progress + speed) % 1.0;
    const pt = getPointAlongCircuit(p.progress, redPost, blackPost, redRail, blueRail, swPos, ledPos, resPos);

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.fill();
  });

  ctx.restore();
}

function getPointAlongCircuit(progress, redPost, blackPost, redRail, blueRail, swPos, ledPos, resPos) {
  // 6 discrete stages of the closed circuit loop
  const stage = progress * 6.0;
  const idx = Math.floor(stage);
  const frac = stage - idx;

  if (idx === 0) {
    // Red Banana Cable: cubic bezier
    return getCubicBezierPoint(
      { x: redPost.x + 2, y: redPost.y + 8 },
      { x: redPost.x + 35, y: redPost.y + 95 },
      { x: redRail.x - 60, y: redRail.y + 40 },
      redRail,
      frac
    );
  } else if (idx === 1) {
    // Red Rail to Switch
    return getCubicBezierPoint(
      redRail,
      { x: redRail.x + 40, y: redRail.y + 15 },
      { x: swPos.x - 30, y: swPos.y + 15 },
      { x: swPos.x - 12, y: swPos.y },
      frac
    );
  } else if (idx === 2) {
    // Switch to LED (Blue Wire)
    return getCubicBezierPoint(
      { x: swPos.x + 12, y: swPos.y },
      { x: swPos.x + 40, y: swPos.y - 20 },
      { x: ledPos.x - 40, y: ledPos.y - 15 },
      { x: ledPos.x - 12, y: ledPos.y + 12 },
      frac
    );
  } else if (idx === 3) {
    // LED to Resistor (Green Wire)
    return getCubicBezierPoint(
      { x: ledPos.x + 12, y: ledPos.y + 12 },
      { x: ledPos.x + 30, y: ledPos.y + 35 },
      { x: resPos.x - 40, y: resPos.y + 25 },
      { x: resPos.x - 26, y: resPos.y + 8 },
      frac
    );
  } else if (idx === 4) {
    // Resistor to Blue Rail
    return getCubicBezierPoint(
      { x: resPos.x + 26, y: resPos.y + 8 },
      { x: resPos.x + 45, y: resPos.y + 25 },
      { x: blueRail.x + 60, y: blueRail.y + 20 },
      blueRail,
      frac
    );
  } else {
    // Black Banana Cable: blueRail -> blackPost
    return getCubicBezierPoint(
      blueRail,
      { x: blueRail.x - 45, y: blueRail.y + 65 },
      { x: blackPost.x + 25, y: blackPost.y + 140 },
      { x: blackPost.x + 2, y: blackPost.y + 8 },
      frac
    );
  }
}

function getCubicBezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

function drawSmokePuffs(ctx, smokeParticles) {
  ctx.save();
  smokeParticles.forEach((p) => {
    ctx.fillStyle = `rgba(148, 163, 184, ${p.opacity * 0.7})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// Floating In-Set Oscilloscope Window (CRUMB / Rigol Style)
function drawFloatingScope(ctx, x, y, data, showA, showB, spec, voltage, currentMa, isConducting) {
  ctx.save();
  const sw = 250;
  const sh = 145;

  // Frame Box
  ctx.fillStyle = '#090d16';
  ctx.fillRect(x, y, sw, sh);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, sw, sh);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x, y, sw, 22);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('CRUMB SCOPE TOOL (LIVE)', x + 8, y + 15);

  // Screen Grid
  const sx = x + 8;
  const sy = y + 28;
  const gw = 150;
  const gh = 105;

  ctx.fillStyle = '#020617';
  ctx.fillRect(sx, sy, gw, gh);
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
  ctx.lineWidth = 1;

  for (let gx = 0; gx <= gw; gx += 25) {
    ctx.beginPath();
    ctx.moveTo(sx + gx, sy);
    ctx.lineTo(sx + gx, sy + gh);
    ctx.stroke();
  }
  for (let gy = 0; gy <= gh; gy += 21) {
    ctx.beginPath();
    ctx.moveTo(sx, sy + gy);
    ctx.lineTo(sx + gw, sy + gy);
    ctx.stroke();
  }

  // Draw Waveform Curves
  if (data.length > 1) {
    // Channel A: Yellow Trace (Voltage)
    if (showA) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      data.forEach((pt, i) => {
        const px = sx + (i / 180) * gw;
        const py = sy + gh - (pt.a / 12.0) * (gh - 10) - 10;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Channel B: LED Color Trace (Current)
    if (showB) {
      ctx.strokeStyle = spec.colorHex;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      data.forEach((pt, i) => {
        const px = sx + (i / 180) * gw;
        const py = sy + gh - (pt.b / 8.0) * (gh - 10) - 8;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }

  // Right Side Telemetry Readouts
  const cx = x + 168;
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('CH1 [Vs]', cx, y + 42);
  ctx.fillStyle = '#64748b';
  ctx.fillText(`${(isConducting ? voltage : 0).toFixed(2)} V`, cx, y + 54);

  ctx.fillStyle = spec.colorHex;
  ctx.fillText('CH2 [I]', cx, y + 78);
  ctx.fillStyle = '#64748b';
  ctx.fillText(`${currentMa.toFixed(1)} mA`, cx, y + 90);

  ctx.fillStyle = '#38bdf8';
  ctx.fillText(isConducting ? 'TRIG: AUTO' : 'TRIG: STOP', cx, y + 118);

  ctx.restore();
}

function draw3DDip14Chip(ctx, cx, cy, partNumber) {
  ctx.save();
  const cw = 74;
  const ch = 28;

  // Drop shadow under IC
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, cw * 0.52, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Silver Pins (7 on top, 7 on bottom)
  ctx.fillStyle = '#cbd5e1';
  for (let i = 0; i < 7; i++) {
    const px = cx - 27 + i * 9;
    // Top Pins (inserted into upper breadboard row)
    ctx.fillRect(px - 1.5, cy - 18, 3, 7);
    // Bottom Pins (inserted into lower breadboard row)
    ctx.fillRect(px - 1.5, cy + 11, 3, 7);
  }

  // Black Plastic DIP-14 Body
  const bodyGrad = ctx.createLinearGradient(cx - cw * 0.5, cy - ch * 0.5, cx + cw * 0.5, cy + ch * 0.5);
  bodyGrad.addColorStop(0, '#1e293b');
  bodyGrad.addColorStop(0.3, '#0f172a');
  bodyGrad.addColorStop(1, '#020617');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(cx - cw * 0.5, cy - ch * 0.5, cw, ch, 4);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pin 1 Index Notch (half circle on left side)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx - cw * 0.5, cy, 4, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.stroke();

  // Pin 1 Dot
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(cx - cw * 0.5 + 8, cy + 7, 2, 0, Math.PI * 2);
  ctx.fill();

  // Laser-etched white silkscreen label
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(partNumber, cx + 4, cy - 2);
  ctx.font = '7px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('QUAD 2-IN AND', cx + 4, cy + 8);

  ctx.restore();
}

function draw3DInputToggleSwitch(ctx, x, y, state, isHovered, label) {
  ctx.save();
  const isHigh = state === 1;

  // Casing
  ctx.fillStyle = isHovered ? '#1e293b' : '#0f172a';
  ctx.fillRect(x - 12, y - 10, 24, 20);
  ctx.strokeStyle = isHovered ? '#38bdf8' : '#334155';
  ctx.lineWidth = isHovered ? 2 : 1;
  ctx.strokeRect(x - 12, y - 10, 24, 20);

  // Button lever
  ctx.fillStyle = isHigh ? '#06b6d4' : '#475569';
  ctx.shadowColor = isHigh ? '#06b6d4' : 'transparent';
  ctx.shadowBlur = isHigh ? 8 : 0;
  ctx.beginPath();
  ctx.arc(x, y - (isHigh ? 0 : 3), 6, 0, Math.PI * 2);
  ctx.fill();

  // Silver metal terminals
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x - 14, y - 4, 3, 8);
  ctx.fillRect(x + 11, y - 4, 3, 8);

  // Label above
  ctx.fillStyle = isHigh ? '#38bdf8' : '#94a3b8';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`IN ${label}:${state}`, x, y - 13);

  ctx.restore();
}

function drawDigitalBreadboardJumpers(ctx, redRail, blueRail, bx, by, logicA, logicB, gateOutput, isConducting) {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  // Jumper 1 (Red): Red +5V Rail -> Pin 14 of IC (top-left pin of chip: bx + 43, by + 34)
  ctx.strokeStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(redRail.x, redRail.y);
  ctx.bezierCurveTo(redRail.x + 35, redRail.y - 10, bx + 15, by + 10, bx + 43, by + 34);
  ctx.stroke();

  // Jumper 2 (Black): Blue GND Rail -> Pin 7 of IC (bottom-right pin of chip: bx + 97, by + 56)
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(blueRail.x, blueRail.y);
  ctx.bezierCurveTo(blueRail.x + 60, blueRail.y + 15, bx + 65, by + 75, bx + 97, by + 56);
  ctx.stroke();

  // Jumper 3 (Yellow): Input Switch A (bx - 15, by + 65) -> Pin 1 of IC (bx + 43, by + 56)
  ctx.strokeStyle = (logicA === 1 && isConducting) ? '#eab308' : '#713f12';
  ctx.beginPath();
  ctx.moveTo(bx - 3, by + 65);
  ctx.bezierCurveTo(bx + 10, by + 72, bx + 25, by + 65, bx + 43, by + 56);
  ctx.stroke();

  // Jumper 4 (Orange): Input Switch B (bx + 15, by + 85) -> Pin 2 of IC (bx + 52, by + 56)
  ctx.strokeStyle = (logicB === 1 && isConducting) ? '#f97316' : '#7c2d12';
  ctx.beginPath();
  ctx.moveTo(bx + 27, by + 85);
  ctx.bezierCurveTo(bx + 35, by + 80, bx + 42, by + 68, bx + 52, by + 56);
  ctx.stroke();

  // Jumper 5 (Green): Pin 3 of IC (Output 1Y: bx + 61, by + 56) -> Resistor (bx + 175 - 26, by + 45 + 8)
  ctx.strokeStyle = (gateOutput === 1 && isConducting) ? '#10b981' : '#14532d';
  ctx.beginPath();
  ctx.moveTo(bx + 61, by + 56);
  ctx.bezierCurveTo(bx + 90, by + 75, bx + 125, by + 65, bx + 149, by + 53);
  ctx.stroke();

  // Jumper 6 (Cyan): Resistor (bx + 175 + 26, by + 45 + 8) -> LED Anode (bx + 235 - 12, by + 30 + 12)
  ctx.strokeStyle = (gateOutput === 1 && isConducting) ? '#06b6d4' : '#164e63';
  ctx.beginPath();
  ctx.moveTo(bx + 201, by + 53);
  ctx.bezierCurveTo(bx + 210, by + 50, bx + 218, by + 45, bx + 223, by + 42);
  ctx.stroke();

  // Jumper 7 (Black): LED Cathode (bx + 235 + 12, by + 30 + 12) -> Blue GND Rail
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(bx + 247, by + 42);
  ctx.bezierCurveTo(bx + 255, by + 55, bx + 150, by + 85, blueRail.x, blueRail.y);
  ctx.stroke();

  ctx.restore();
}

function drawDigitalElectrons(ctx, particles, redPost, blackPost, redRail, blueRail, bx, by) {
  ctx.save();
  const speed = 0.004;

  particles.forEach((p) => {
    p.progress = (p.progress + speed) % 1.0;
    const stage = p.progress * 4.0;
    const idx = Math.floor(stage);
    const frac = stage - idx;

    let pt;
    if (idx === 0) {
      pt = getCubicBezierPoint(
        { x: redPost.x + 2, y: redPost.y + 8 },
        { x: redPost.x + 35, y: redPost.y + 95 },
        { x: redRail.x - 60, y: redRail.y + 40 },
        redRail,
        frac
      );
    } else if (idx === 1) {
      pt = getCubicBezierPoint(
        redRail,
        { x: bx + 15, y: by + 10 },
        { x: bx + 43, y: by + 34 },
        { x: bx + 61, y: by + 56 },
        frac
      );
    } else if (idx === 2) {
      pt = getCubicBezierPoint(
        { x: bx + 61, y: by + 56 },
        { x: bx + 125, y: by + 65 },
        { x: bx + 201, y: by + 53 },
        { x: bx + 235, y: by + 42 },
        frac
      );
    } else {
      pt = getCubicBezierPoint(
        { x: bx + 235, y: by + 42 },
        { x: blueRail.x + 30, y: blueRail.y + 40 },
        { x: blackPost.x + 25, y: blackPost.y + 140 },
        { x: blackPost.x + 2, y: blackPost.y + 8 },
        frac
      );
    }

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.fill();
  });

  ctx.restore();
}
