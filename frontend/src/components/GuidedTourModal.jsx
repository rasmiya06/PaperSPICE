import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronRight, ChevronLeft, X, Sparkles, CheckCircle, Zap, ShieldAlert, Cpu, Flame, Layers } from 'lucide-react';
import { circuitAudio } from '../utils/audio';

export const TOUR_STEPS = [
  {
    step: 1,
    title: '1. Ingest Hand-Drawn Sketch',
    subtitle: 'Computer Vision & Morphological Processing',
    badge: 'Computer Vision',
    icon: Sparkles,
    content: 'PaperSPICE ingests an authentic hand-drawn paper sketch. It applies Otsu binarization, bilateral denoising, and Zhang-Suen morphological thinning to extract topological skeleton graphs without hallucinating symbols.',
    actionName: 'Loading Hero Gap Sketch...'
  },
  {
    step: 2,
    title: '2. The Uncertainty Gate Halts Ambiguity',
    subtitle: 'Our Core Winning Innovation',
    badge: 'Explainable AI',
    icon: ShieldAlert,
    content: 'The pipeline identifies an unclosed 30.1px gap between the switch and resistor. Instead of guessing or hallucinating false connections, PaperSPICE flags it in the Uncertainty Gate and alerts the human engineer.',
    actionName: 'Beacon Highlighted at (410, 55)'
  },
  {
    step: 3,
    title: '3. Human-in-the-Loop Verification',
    subtitle: 'Zero-Friction One-Click Bridging',
    badge: 'Human + AI',
    icon: CheckCircle,
    content: 'With a single click on "Bridge Gap", the engineer confirms physical continuity. PaperSPICE plays an audio confirmation chime, synthesizes the netlist, and passes the graph to the physics solver.',
    actionName: 'Bridging Wire Continuity...'
  },
  {
    step: 4,
    title: '4. Modified Nodal Analysis (MNA)',
    subtitle: 'Real Semiconductor Physics (21.21 mA)',
    badge: 'Physics Engine',
    icon: Zap,
    content: 'Unlike naive tools that use I = 9V / 330Ω = 27.27 mA, our MNA engine subtracts the LED forward diode drop (Vf = 2.0V), solving I = (9 - 2) / 330 = 21.21 mA. Blue electron particles flow at 60 FPS!',
    actionName: 'Electrons Conducting at 60 FPS'
  },
  {
    step: 5,
    title: '5. Tinkercad-Style Component Burnout',
    subtitle: 'Overcurrent Protection & Explosion FX',
    badge: 'Hardware Safety',
    icon: Flame,
    content: 'Dropping ballast resistance to 100Ω pushes current to 70 mA (exceeding the 30 mA LED limit). PaperSPICE triggers a Tinkercad-style starburst explosion, animated smoke puffs, and FLIR thermal blooming!',
    actionName: 'Resistor Set to 100Ω ➔ 70 mA Overload'
  },
  {
    step: 6,
    title: '6. 3D Digital Hardware Twin & PCB CAD',
    subtitle: 'CRUMB 3D Workbench & KiCad CAD Export',
    badge: 'Digital Hardware Twin',
    icon: Cpu,
    content: 'Inspect your sketch live on our 3D Isometric Workbench with a glowing benchtop power supply, 3D breadboard, and CRT oscilloscope. Export production KiCad PCB netlists (.net) with one click!',
    actionName: 'Interactive Hardware Twin Synchronized'
  }
];

export default function GuidedTourModal({
  isOpen,
  onClose,
  onStepAction
}) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const step = TOUR_STEPS[currentStepIdx];
  const StepIcon = step.icon;

  // Auto-progress timer (5.5 seconds per step)
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    setProgress(0);
    const interval = 50;
    const totalDuration = 5500;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min(100, (elapsed / totalDuration) * 100));

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        if (currentStepIdx < TOUR_STEPS.length - 1) {
          handleNext();
        } else {
          setIsPlaying(false);
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentStepIdx]);

  // Execute actual state actions in main app when step changes
  useEffect(() => {
    if (isOpen && onStepAction) {
      onStepAction(currentStepIdx + 1);
    }
  }, [isOpen, currentStepIdx]);

  if (!isOpen) return null;

  const handleNext = () => {
    circuitAudio.playProbeBeep(1400);
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
      setProgress(0);
    }
  };

  const handlePrev = () => {
    circuitAudio.playProbeBeep(1100);
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Progress Bar */}
        <div className="h-1.5 w-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shadow-md">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 font-mono">
                  {step.badge}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Step {currentStepIdx + 1} of {TOUR_STEPS.length}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">
                {step.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold text-cyan-400">
            {step.subtitle}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {step.content}
          </p>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="text-[11px] text-slate-500">Live Stage Action:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
              {step.actionName}
            </span>
          </div>
        </div>

        {/* Step Indicator Dots */}
        <div className="px-6 flex items-center justify-center gap-2">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.step}
              onClick={() => {
                circuitAudio.playProbeBeep(1200);
                setCurrentStepIdx(idx);
                setProgress(0);
              }}
              className={`h-2 rounded-full transition-all ${
                idx === currentStepIdx
                  ? 'w-8 bg-cyan-400'
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Resume'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIdx === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            {currentStepIdx < TOUR_STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Finish Tour & Experiment</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
