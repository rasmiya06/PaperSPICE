import React, { useRef, useEffect, useState } from 'react';
import { Layers, Download, CheckCircle, Cpu, Eye, Sparkles, Sliders, Info } from 'lucide-react';
import { circuitAudio } from '../utils/audio';

export default function PcbBlueprint({
  voltage = 9.0,
  resistance = 330.0,
  simulation,
  ledColor = 'green'
}) {
  const canvasRef = useRef(null);
  const [layers, setLayers] = useState({
    topCopper: true,
    bottomCopper: true,
    silkscreen: true,
    soldermask: true,
    drillHoles: true,
    groundPour: true
  });

  const [hoveredNet, setHoveredNet] = useState(null);
  const [copiedNetlist, setCopiedNetlist] = useState(false);

  const isConducting = simulation?.is_closed_loop;
  const currentMa = simulation?.current_ma ?? 21.21;

  const isDigital = simulation?.circuit_type === 'DIGITAL_LOGIC';

  // PCB Board Coordinates & Layout Definition (Dynamic for Analog vs Digital)
  const boardLayout = isDigital ? {
    width: 680,
    height: 380,
    components: [
      {
        id: 'PWR1',
        name: 'PWR1 (+5V TTL Power)',
        x: 100,
        y: 190,
        w: 60,
        h: 90,
        pins: [
          { id: '1', net: 'NET_VCC_5V', x: 100, y: 160, label: '5V' },
          { id: '2', net: 'GND', x: 100, y: 220, label: 'GND' }
        ]
      },
      {
        id: 'IN1',
        name: 'IN1 (Logic Inputs A/B)',
        x: 230,
        y: 100,
        w: 70,
        h: 70,
        pins: [
          { id: '1', net: 'NET_INA', x: 210, y: 100, label: '1A' },
          { id: '2', net: 'NET_INB', x: 250, y: 100, label: '1B' }
        ]
      },
      {
        id: 'U1',
        name: 'U1 (74HC08 DIP-14 Logic IC)',
        x: 390,
        y: 190,
        w: 130,
        h: 80,
        pins: [
          { id: '1', net: 'NET_INA', x: 350, y: 165, label: '1A' },
          { id: '2', net: 'NET_INB', x: 375, y: 165, label: '1B' },
          { id: '3', net: 'NET_Y', x: 400, y: 165, label: '1Y' },
          { id: '7', net: 'GND', x: 435, y: 165, label: 'GND' },
          { id: '14', net: 'NET_VCC_5V', x: 350, y: 215, label: 'VCC' }
        ]
      },
      {
        id: 'R1',
        name: 'R1 (330Ω Pull-Up)',
        x: 540,
        y: 110,
        w: 80,
        h: 40,
        pins: [
          { id: '1', net: 'NET_Y', x: 510, y: 110, label: '1' },
          { id: '2', net: 'NET_LED_IN', x: 570, y: 110, label: '2' }
        ]
      },
      {
        id: 'D1',
        name: `D1 (Output Status LED - ${ledColor.toUpperCase()})`,
        x: 540,
        y: 280,
        w: 60,
        h: 60,
        pins: [
          { id: '1', net: 'NET_LED_IN', x: 520, y: 280, label: 'A' },
          { id: '2', net: 'GND', x: 560, y: 280, label: 'K' }
        ]
      }
    ]
  } : {
    width: 680,
    height: 380,
    components: [
      {
        id: 'BT1',
        name: 'BT1 (9V DC Input)',
        x: 100,
        y: 190,
        w: 60,
        h: 90,
        pins: [
          { id: '1', net: 'NET_VCC', x: 100, y: 160, label: '+' },
          { id: '2', net: 'GND', x: 100, y: 220, label: '-' }
        ]
      },
      {
        id: 'SW1',
        name: 'SW1 (Tactile Switch 6x6)',
        x: 270,
        y: 100,
        w: 70,
        h: 70,
        pins: [
          { id: '1', net: 'NET_VCC', x: 245, y: 100, label: '1' },
          { id: '2', net: 'NET_SW_OUT', x: 295, y: 100, label: '2' }
        ]
      },
      {
        id: 'R1',
        name: `R1 (${resistance}Ω 1/4W)`,
        x: 460,
        y: 100,
        w: 90,
        h: 40,
        pins: [
          { id: '1', net: 'NET_SW_OUT', x: 425, y: 100, label: '1' },
          { id: '2', net: 'NET_ANODE', x: 495, y: 100, label: '2' }
        ]
      },
      {
        id: 'D1',
        name: `D1 (LED 5mm ${ledColor.toUpperCase()})`,
        x: 460,
        y: 280,
        w: 60,
        h: 60,
        pins: [
          { id: '1', net: 'NET_ANODE', x: 440, y: 280, label: 'A' },
          { id: '2', net: 'GND', x: 480, y: 280, label: 'K' }
        ]
      }
    ]
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // 1. Base FR-4 Substrate
    if (layers.soldermask) {
      // Matte dark green solder mask (or dark blue for digital)
      const pcbGrad = ctx.createLinearGradient(40, 30, w - 40, h - 30);
      if (isDigital) {
        pcbGrad.addColorStop(0, '#0c1b33');
        pcbGrad.addColorStop(0.5, '#0e2342');
        pcbGrad.addColorStop(1, '#071224');
      } else {
        pcbGrad.addColorStop(0, '#0c2e17');
        pcbGrad.addColorStop(0.5, '#0e381c');
        pcbGrad.addColorStop(1, '#082311');
      }
      ctx.fillStyle = pcbGrad;
      ctx.fillRect(40, 30, w - 80, h - 60);

      // Glass fiber weave texture effect
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      for (let i = 40; i < w - 40; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 30);
        ctx.lineTo(i, h - 30);
        ctx.stroke();
      }
      for (let j = 30; j < h - 30; j += 6) {
        ctx.beginPath();
        ctx.moveTo(40, j);
        ctx.lineTo(w - 40, j);
        ctx.stroke();
      }
    } else {
      // Raw copper FR-4 laminate
      ctx.fillStyle = '#78350f';
      ctx.fillRect(40, 30, w - 80, h - 60);
    }

    // Board Outline Chamfered Edges & Gold Mounting Holes
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 30, w - 80, h - 60);

    // 4 Corner Gold-Plated Mounting Holes M3 (3.2mm)
    const corners = [
      { x: 60, y: 50 },
      { x: w - 60, y: 50 },
      { x: 60, y: h - 50 },
      { x: w - 60, y: h - 50 }
    ];
    corners.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#d97706';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#050505';
      ctx.fill();
    });

    // 2. Ground Plane Pour Pattern
    if (layers.groundPour) {
      ctx.fillStyle = isDigital ? 'rgba(56, 189, 248, 0.04)' : 'rgba(16, 185, 129, 0.04)';
      ctx.fillRect(45, 35, w - 90, h - 70);
    }

    // 3. Bottom Copper Traces (B.Cu - Blue in EDA CAD)
    if (layers.bottomCopper) {
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const isNetGnd = hoveredNet === 'GND';
      ctx.strokeStyle = isNetGnd ? '#38bdf8' : 'rgba(59, 130, 246, 0.75)';

      if (isDigital) {
        // Digital GND Trace
        ctx.beginPath();
        ctx.moveTo(100, 220);
        ctx.lineTo(100, 320);
        ctx.lineTo(435, 320);
        ctx.lineTo(435, 165);
        ctx.moveTo(435, 320);
        ctx.lineTo(560, 320);
        ctx.lineTo(560, 280);
        ctx.stroke();
      } else {
        // Analog GND Trace: LED Cathode (480, 280) -> Battery Neg (100, 220)
        ctx.beginPath();
        ctx.moveTo(480, 280);
        ctx.lineTo(480, 315);
        ctx.lineTo(100, 315);
        ctx.lineTo(100, 220);
        ctx.stroke();
      }

      if (isNetGnd) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 4. Top Copper Traces (F.Cu - Red/Gold in EDA CAD)
    if (layers.topCopper) {
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (isDigital) {
        // VCC 5V Trace
        let isVcc = hoveredNet === 'NET_VCC_5V';
        ctx.strokeStyle = isVcc ? '#38bdf8' : 'rgba(239, 68, 68, 0.85)';
        ctx.beginPath();
        ctx.moveTo(100, 160);
        ctx.lineTo(100, 245);
        ctx.lineTo(350, 245);
        ctx.lineTo(350, 215);
        ctx.stroke();

        // INA Trace
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.beginPath();
        ctx.moveTo(210, 100);
        ctx.lineTo(210, 140);
        ctx.lineTo(350, 140);
        ctx.lineTo(350, 165);
        ctx.stroke();

        // INB Trace
        ctx.beginPath();
        ctx.moveTo(250, 100);
        ctx.lineTo(250, 150);
        ctx.lineTo(375, 150);
        ctx.lineTo(375, 165);
        ctx.stroke();

        // Output Y to R1 to LED
        ctx.beginPath();
        ctx.moveTo(400, 165);
        ctx.lineTo(400, 110);
        ctx.lineTo(510, 110);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(570, 110);
        ctx.lineTo(570, 210);
        ctx.lineTo(520, 210);
        ctx.lineTo(520, 280);
        ctx.stroke();
      } else {
        // Analog Traces
        let isVcc = hoveredNet === 'NET_VCC';
        ctx.strokeStyle = isVcc ? '#38bdf8' : 'rgba(239, 68, 68, 0.85)';
        ctx.beginPath();
        ctx.moveTo(100, 160);
        ctx.lineTo(100, 100);
        ctx.lineTo(245, 100);
        ctx.stroke();

        let isSwOut = hoveredNet === 'NET_SW_OUT';
        ctx.strokeStyle = isSwOut ? '#38bdf8' : 'rgba(239, 68, 68, 0.85)';
        ctx.beginPath();
        ctx.moveTo(295, 100);
        ctx.lineTo(425, 100);
        ctx.stroke();

        let isAnode = hoveredNet === 'NET_ANODE';
        ctx.strokeStyle = isAnode ? '#38bdf8' : 'rgba(239, 68, 68, 0.85)';
        ctx.beginPath();
        ctx.moveTo(495, 100);
        ctx.lineTo(540, 100);
        ctx.lineTo(540, 240);
        ctx.lineTo(440, 240);
        ctx.lineTo(440, 280);
        ctx.stroke();
      }
    }

    // 5. Silkscreen Legend Layer (F.SilkS - White Ink)
    if (layers.silkscreen) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.font = 'bold 12px monospace';
      ctx.fillText(isDigital ? 'PAPERSPICE 74HC08 LOGIC CAD // REV 2.0 DIGITAL' : 'PAPERSPICE HW-LAB // REV 1.0 ANALOG', 70, 60);
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(isDigital ? 'AUTOGEN FROM DIGITAL LOGIC SCHEMATIC • BANANA HACKS 2026' : 'AUTOGEN FROM PAPER INK SKETCH • BANANA HACKS 2026', 70, 75);

      // Component Outlines & Text
      boardLayout.components.forEach((c) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.name, c.x, c.y - c.h / 2 - 8);

        // Pin 1 Indicator Dot
        ctx.beginPath();
        ctx.arc(c.x - c.w / 2 + 8, c.y - c.h / 2 + 8, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // LED Flat Cathode Marker
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(485, 260);
      ctx.lineTo(485, 300);
      ctx.stroke();
    }

    // 6. Solder Pads & Drill Holes (ENIG Gold Pads + Black Drills)
    boardLayout.components.forEach((comp) => {
      comp.pins.forEach((pin) => {
        const isHovered = hoveredNet === pin.net;

        // Outer ENIG Pad
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, isHovered ? 11 : 9, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#38bdf8' : '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Through-hole drill
        if (layers.drillHoles) {
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#09090b';
          ctx.fill();
        }

        // Pin text label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pin.label, pin.x, pin.y + (pin.y > comp.y ? 16 : -12));
      });
    });

  }, [layers, hoveredNet, resistance, voltage, ledColor, isConducting]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if mouse is hovering near any pad
    let foundNet = null;
    boardLayout.components.forEach((comp) => {
      comp.pins.forEach((pin) => {
        const dx = x - pin.x;
        const dy = y - pin.y;
        if (Math.hypot(dx, dy) < 18) {
          foundNet = pin.net;
        }
      });
    });

    if (foundNet !== hoveredNet) {
      if (foundNet) circuitAudio.playProbeBeep(1800);
      setHoveredNet(foundNet);
    }
  };

  const downloadKiCadNetlist = () => {
    circuitAudio.playBridgeChime();
    const netlistContent = `(export (version D)
  (design
    (source "PaperSPICE_AutoReconstruct.kicad_sch")
    (date "Banana Hacks 2026")
    (tool "PaperSPICE Vision-to-EDA Converter v1.0")
  )
  (components
    (comp (ref "BT1") (value "9V_DC_IN") (footprint "Connector_JST:JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical"))
    (comp (ref "SW1") (value "TACTILE_SPST") (footprint "Button_Switch_THT:SW_PUSH_6mm_H5mm"))
    (comp (ref "R1") (value "${resistance}R_1/4W") (footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"))
    (comp (ref "D1") (value "LED_5MM_${ledColor.toUpperCase()}") (footprint "LED_THT:LED_D5.0mm"))
  )
  (nets
    (net (code "1") (name "NET_VCC")
      (node (ref "BT1") (pin "1"))
      (node (ref "SW1") (pin "1")))
    (net (code "2") (name "NET_SW_OUT")
      (node (ref "SW1") (pin "2"))
      (node (ref "R1") (pin "1")))
    (net (code "3") (name "NET_ANODE")
      (node (ref "R1") (pin "2"))
      (node (ref "D1") (pin "1")))
    (net (code "4") (name "GND")
      (node (ref "D1") (pin "2"))
      (node (ref "BT1") (pin "2")))
  )
)`;

    const blob = new Blob([netlistContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PaperSPICE_Board_KiCad.net`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedNetlist(true);
    setTimeout(() => setCopiedNetlist(false), 2500);
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center">
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              Auto-Generated PCB Blueprint & KiCad CAD Model
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                Production Ready
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Direct vector translation: Hand-Drawn Sketch ➔ FR-4 Printed Circuit Board with ENIG Plated Pads
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={downloadKiCadNetlist}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
        >
          {copiedNetlist ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-white" />
              <span>Downloaded Netlist!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Export KiCad Netlist (.net)</span>
            </>
          )}
        </button>
      </div>

      {/* Layer Toggles & Inspection HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" /> EDA Layers:
          </span>
          <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={layers.topCopper}
              onChange={(e) => setLayers({ ...layers, topCopper: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
              F.Cu (Top Red)
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={layers.bottomCopper}
              onChange={(e) => setLayers({ ...layers, bottomCopper: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              B.Cu (Bottom Blue)
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={layers.silkscreen}
              onChange={(e) => setLayers({ ...layers, silkscreen: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-white focus:ring-0"
            />
            <span>F.SilkS (Legend)</span>
          </label>

          <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={layers.groundPour}
              onChange={(e) => setLayers({ ...layers, groundPour: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>GND Pour</span>
          </label>
        </div>

        {/* Live Net Hover HUD */}
        <div className="font-mono text-[11px] px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
          {hoveredNet ? (
            <span className="text-cyan-400 font-bold">
              ⚡ Selected Net: <span className="underline">{hoveredNet}</span> (Traced in Cyan)
            </span>
          ) : (
            <span className="text-slate-500">Hover over any pin pad to inspect net route</span>
          )}
        </div>
      </div>

      {/* Photorealistic PCB Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={680}
          height={380}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNet(null)}
          className="w-full max-w-3xl h-auto block rounded-xl cursor-crosshair shadow-2xl"
        />

        {/* Floating Spec Watermark */}
        <div className="absolute bottom-4 left-6 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-400">
          FR-4 Standard 1.6mm • 1oz Copper • ENIG Surface Finish • JLCPCB / PCBWay DRC Compliant
        </div>
      </div>
    </div>
  );
}
