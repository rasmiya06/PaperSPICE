import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import PerceptionViewer from './components/PerceptionViewer';
import SimulatorCanvas from './components/SimulatorCanvas';
import PhysicsControls from './components/PhysicsControls';
import Multimeter from './components/Multimeter';
import Oscilloscope from './components/Oscilloscope';
import BreadboardView from './components/BreadboardView';
import FaultDiagnostics from './components/FaultDiagnostics';
import AmbiguityLab from './components/AmbiguityLab';
import CircuitTutor from './components/CircuitTutor';
import LEDColorPicker, { LED_SPECS } from './components/LEDColorPicker';
import LabChallenges from './components/LabChallenges';
import LabReportModal from './components/LabReportModal';
import SpiceViewer from './components/SpiceViewer';
import WebcamModal from './components/WebcamModal';
import DoodleCanvasModal from './components/DoodleCanvasModal';
import ComponentInspectorModal from './components/ComponentInspectorModal';
import PcbBlueprint from './components/PcbBlueprint';
import AiCopilotDrawer from './components/AiCopilotDrawer';
import GuidedTourModal from './components/GuidedTourModal';
import BenchmarkDashboard from './components/BenchmarkDashboard';
import TopologyDiffViewer from './components/TopologyDiffViewer';
import { circuitAudio } from './utils/audio';
import {
  Upload, Camera, Sparkles, Activity, Cpu, ShieldAlert,
  Terminal, GitBranch, BookOpen, PenTool, Play, Pause,
  FileText, Trophy, Layers, Bot, Award, GitCompare, X, RotateCcw
} from 'lucide-react';

export default function App() {
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hidden file input reference for easy 1-click trigger
  const fileInputRef = useRef(null);

  // Active Bottom Tab: 'breadboard' | 'pcb' | 'benchmark' | 'diff' | 'ambiguity' | 'telemetry' | 'tutor' | 'safety' | 'spice'
  const [activeTab, setActiveTab] = useState('breadboard');

  // Simulation Engine State
  const [isSimRunning, setIsSimRunning] = useState(true);

  // Ambiguity Hypothesis: 'bridge' | 'junction'
  const [activeInterpretation, setActiveInterpretation] = useState('bridge');

  // LED Color State
  const [ledColor, setLedColor] = useState('green');

  // Signal Generator Mode
  const [signalMode, setSignalMode] = useState('dc');
  const [pwmDuty, setPwmDuty] = useState(65);
  const [acFreq, setAcFreq] = useState(50);

  // Perception Data (null by default so user starts on clean, honest canvas!)
  const [originalImage, setOriginalImage] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);
  const [components, setComponents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [uncertainGaps, setUncertainGaps] = useState([]);

  // Simulation Parameters & State
  const computeSandboxSimulation = (v, r, sw, color) => {
    const spec = LED_SPECS[color] || LED_SPECS.green;
    const isClosed = sw === 'closed';
    const i_ma = isClosed ? Math.max(0, ((v - spec.vf) / r) * 1000) : 0;
    return {
      is_closed_loop: isClosed,
      current_ma: parseFloat(i_ma.toFixed(2)),
      voltage_source_v: v,
      resistor_voltage_v: parseFloat((isClosed ? v - spec.vf : 0).toFixed(2)),
      led_voltage_v: isClosed ? spec.vf : 0,
      led_brightness: Math.min(1.0, i_ma / 25.0),
      led_state: i_ma > 30 ? 'OVERCURRENT_WARNING' : (i_ma > 1 ? 'NORMAL_CONDUCTION' : 'OFF'),
      resistor_power_mw: parseFloat(((i_ma * i_ma * r) / 1000).toFixed(1)),
      led_power_mw: parseFloat((i_ma * spec.vf).toFixed(1))
    };
  };

  const [bridgedGaps, setBridgedGaps] = useState([]);
  const [switchState, setSwitchState] = useState('closed');
  const [voltage, setVoltage] = useState(9.0);
  const [resistance, setResistance] = useState(330.0);
  const [simulation, setSimulation] = useState(() => computeSandboxSimulation(9.0, 330.0, 'closed', 'green'));
  const [spiceNetlist, setSpiceNetlist] = useState('');

  // Modals & Drawers
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [isDrawOpen, setIsDrawOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Load presets list on startup (do NOT force preset_gap so user can start fresh!)
  useEffect(() => {
    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => {
        setPresets(data.presets || []);
      })
      .catch((err) => {
        console.error('Failed to load presets list:', err);
      });
  }, []);

  const handleScanPreset = async (presetId) => {
    setSelectedPresetId(presetId);
    setLoading(true);
    setBridgedGaps([]);

    try {
      const activeSpec = LED_SPECS[ledColor] || LED_SPECS.green;
      const formData = new FormData();
      formData.append('preset_id', presetId);
      formData.append('voltage_v', voltage);
      formData.append('resistance_ohms', resistance);
      formData.append('switch_state', switchState);
      formData.append('led_vf', activeSpec.vf);

      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      setOriginalImage(data.original_image);
      setOverlayImage(data.overlay_image);
      setComponents(data.components || []);
      setConnections(data.connections || []);
      setUncertainGaps(data.uncertain_gaps || []);
      setSimulation(data.simulation);
      setSpiceNetlist(data.spice_netlist);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSelectedPresetId(null);
    setBridgedGaps([]);

    try {
      const activeSpec = LED_SPECS[ledColor] || LED_SPECS.green;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('voltage_v', voltage);
      formData.append('resistance_ohms', resistance);
      formData.append('switch_state', switchState);
      formData.append('led_vf', activeSpec.vf);

      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      setOriginalImage(data.original_image);
      setOverlayImage(data.overlay_image);
      setComponents(data.components || []);
      setConnections(data.connections || []);
      setUncertainGaps(data.uncertain_gaps || []);
      setSimulation(data.simulation);
      setSpiceNetlist(data.spice_netlist);
    } catch (err) {
      console.error('File upload scan error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlobScan = async (blob, filename) => {
    setLoading(true);
    setSelectedPresetId(null);
    setBridgedGaps([]);

    try {
      const activeSpec = LED_SPECS[ledColor] || LED_SPECS.green;
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('voltage_v', voltage);
      formData.append('resistance_ohms', resistance);
      formData.append('switch_state', switchState);
      formData.append('led_vf', activeSpec.vf);

      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      setOriginalImage(data.original_image);
      setOverlayImage(data.overlay_image);
      setComponents(data.components || []);
      setConnections(data.connections || []);
      setUncertainGaps(data.uncertain_gaps || []);
      setSimulation(data.simulation);
      setSpiceNetlist(data.spice_netlist);
    } catch (err) {
      console.error('Blob scan error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSketch = () => {
    circuitAudio.playProbeBeep(900);
    setSelectedPresetId(null);
    setOriginalImage(null);
    setOverlayImage(null);
    setComponents([]);
    setConnections([]);
    setUncertainGaps([]);
    setBridgedGaps([]);
    setSimulation(computeSandboxSimulation(voltage, resistance, switchState, ledColor));
    setSpiceNetlist('');
  };

  const [logicInputs, setLogicInputs] = useState({ a: 1, b: 1, c: 1 });

  const triggerSimulationUpdate = async (newBridged, newSwitch, newV, newR, colorKey = ledColor, currentLogicInputs = logicInputs) => {
    if (!connections || connections.length === 0) {
      const sandboxSim = computeSandboxSimulation(newV, newR, newSwitch, colorKey);
      setSimulation(sandboxSim);
      if (sandboxSim.led_state === 'OVERCURRENT_WARNING') {
        circuitAudio.playOvercurrentBuzzer();
      }
      return;
    }

    try {
      const activeSpec = LED_SPECS[colorKey] || LED_SPECS.green;
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connections: connections,
          bridged_gaps: newBridged,
          switch_state: newSwitch,
          voltage_v: newV,
          resistance_ohms: newR,
          led_vf: activeSpec.vf,
          circuit_type: simulation?.circuit_type || 'ANALOG_SERIES',
          logic_inputs: currentLogicInputs,
          components: components
        })
      });
      const data = await res.json();
      setSimulation(data.simulation);
      setSpiceNetlist(data.spice_netlist);

      if (data.simulation?.led_state === 'OVERCURRENT_WARNING') {
        circuitAudio.playOvercurrentBuzzer();
      }
    } catch (err) {
      console.error('Simulation update error:', err);
    }
  };

  const handleToggleLogicPin = (pin) => {
    circuitAudio.playSwitchClick(logicInputs[pin] === 0);
    const updated = {
      ...logicInputs,
      [pin]: logicInputs[pin] === 1 ? 0 : 1
    };
    setLogicInputs(updated);
    triggerSimulationUpdate(bridgedGaps, switchState, voltage, resistance, ledColor, updated);
  };

  const handleBridgeGap = (gapId) => {
    circuitAudio.playBridgeChime();
    const updated = [...bridgedGaps, gapId];
    setBridgedGaps(updated);
    triggerSimulationUpdate(updated, switchState, voltage, resistance);
  };

  const handleUnbridgeGap = (gapId) => {
    const updated = bridgedGaps.filter((id) => id !== gapId);
    setBridgedGaps(updated);
    triggerSimulationUpdate(updated, switchState, voltage, resistance);
  };

  const handleBridgeAllGaps = () => {
    circuitAudio.playBridgeChime();
    const allGapIds = uncertainGaps.map((g) => g.connection_id);
    setBridgedGaps(allGapIds);
    triggerSimulationUpdate(allGapIds, switchState, voltage, resistance);
  };

  const handleToggleSwitch = () => {
    const nextState = switchState === 'closed' ? 'open' : 'closed';
    circuitAudio.playSwitchClick(nextState === 'open');
    setSwitchState(nextState);
    triggerSimulationUpdate(bridgedGaps, nextState, voltage, resistance);
  };

  const handleVoltageChange = (newV) => {
    setVoltage(newV);
    triggerSimulationUpdate(bridgedGaps, switchState, newV, resistance);
  };

  const handleResistanceChange = (newR) => {
    setResistance(newR);
    triggerSimulationUpdate(bridgedGaps, switchState, voltage, newR);
  };

  const handleSelectColor = (colorKey) => {
    setLedColor(colorKey);
    triggerSimulationUpdate(bridgedGaps, switchState, voltage, resistance, colorKey);
  };

  // Automated Guided Tour Live Orchestration
  const handleTourStepAction = (stepNum) => {
    if (stepNum === 1) {
      handleScanPreset('preset_gap');
    } else if (stepNum === 3) {
      handleBridgeAllGaps();
    } else if (stepNum === 4) {
      handleResistanceChange(330);
      handleVoltageChange(9.0);
    } else if (stepNum === 5) {
      handleResistanceChange(100);
    } else if (stepNum === 6) {
      setActiveTab('breadboard');
    }
  };

  const hasImage = Boolean(originalImage);
  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white relative">
      <Header
        onOpenDraw={() => setIsDrawOpen(true)}
        onOpenInspector={() => setIsInspectorOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Control Showcase Bar */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Sample Sketches:
            </span>
            {presets.length > 0 ? (
              presets.map((p) => {
                const isSelected = selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleScanPreset(p.id)}
                    disabled={loading}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-cyan-400'}`} />
                    <span>{p.title}</span>
                  </button>
                );
              })
            ) : (
              <button
                onClick={() => handleScanPreset('preset_gap')}
                disabled={loading}
                className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border bg-slate-800 text-slate-300 border-slate-700"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>⚡ Try Hero Demo (30px Gap)</span>
              </button>
            )}

            {hasImage && (
              <button
                onClick={handleClearSketch}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs font-medium flex items-center gap-1.5 transition-colors ml-1"
                title="Clear sketch and start with a blank canvas"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear / New</span>
              </button>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTourOpen(true)}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold border border-cyan-400/40 text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>30s Tour</span>
            </button>

            <button
              onClick={() => setIsReportOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lab Report</span>
            </button>

            <button
              onClick={() => setIsDrawOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <PenTool className="w-3.5 h-3.5 text-cyan-400" />
              <span>Doodle Pad</span>
            </button>

            <label className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setIsWebcamOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Camera Scan</span>
            </button>
          </div>
        </div>

        {/* Interactive Mini-Game Lab Challenges */}
        <LabChallenges simulation={simulation} />

        {/* Central Workstation: Split Screen (Perception vs Living Simulation) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: Perception & Proof-of-Perception */}
          <div className="min-h-[500px]">
            <PerceptionViewer
              originalImage={originalImage}
              overlayImage={overlayImage}
              uncertainGaps={uncertainGaps}
              bridgedGaps={bridgedGaps}
              selectedPresetTitle={selectedPreset?.title}
              onBridgeGap={handleBridgeGap}
              onUnbridgeGap={handleUnbridgeGap}
              onBridgeAllGaps={handleBridgeAllGaps}
              onLoadHeroPreset={() => handleScanPreset('preset_gap')}
              onOpenDraw={() => setIsDrawOpen(true)}
              onOpenUpload={() => fileInputRef.current?.click()}
              onOpenWebcam={() => setIsWebcamOpen(true)}
              onClear={handleClearSketch}
            />
          </div>

          {/* Right: Living Simulation & Interactive Canvas with Tinkercad FX */}
          <div className="min-h-[500px]">
            <SimulatorCanvas
              simulation={simulation}
              components={components}
              switchState={switchState}
              onToggleSwitch={handleToggleSwitch}
              voltage={voltage}
              resistance={resistance}
              isSimRunning={isSimRunning}
              onToggleSim={() => setIsSimRunning(!isSimRunning)}
              ledColor={ledColor}
              hasImage={hasImage}
              onLoadHeroPreset={() => handleScanPreset('preset_gap')}
              uncertainGaps={uncertainGaps}
              bridgedGaps={bridgedGaps}
              onBridgeAllGaps={handleBridgeAllGaps}
              onVoltageChange={handleVoltageChange}
              onResistanceChange={handleResistanceChange}
              logicInputs={logicInputs}
              onToggleLogicPin={handleToggleLogicPin}
            />
          </div>
        </div>

        {/* Physics Parameter Tuner & Multi-Color Diode Chemistry */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PhysicsControls
            voltage={voltage}
            onVoltageChange={handleVoltageChange}
            resistance={resistance}
            onResistanceChange={handleResistanceChange}
            simulation={simulation}
            signalMode={signalMode}
            onSignalModeChange={setSignalMode}
            pwmDuty={pwmDuty}
            onPwmDutyChange={setPwmDuty}
            acFreq={acFreq}
            onAcFreqChange={setAcFreq}
          />

          <LEDColorPicker
            selectedColor={ledColor}
            onSelectColor={handleSelectColor}
          />
        </div>

        {/* Analytical Suite Navigation Tabs */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('breadboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeTab === 'breadboard'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-300" />
              <span>3D Breadboard Workbench</span>
            </button>

            <button
              onClick={() => setActiveTab('pcb')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeTab === 'pcb'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-teal-300" />
              <span>PCB CAD Blueprint (KiCad)</span>
            </button>

            <button
              onClick={() => setActiveTab('benchmark')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeTab === 'benchmark'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4 text-indigo-300" />
              <span>Empirical Benchmark</span>
            </button>

            <button
              onClick={() => setActiveTab('diff')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeTab === 'diff'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <GitCompare className="w-4 h-4 text-amber-300" />
              <span>Topology Diff Analyzer</span>
            </button>

            <button
              onClick={() => setActiveTab('ambiguity')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeTab === 'ambiguity'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <GitBranch className="w-4 h-4 text-blue-300" />
              <span>Ambiguity Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Oscilloscope</span>
            </button>

            <button
              onClick={() => setActiveTab('tutor')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeTab === 'tutor'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4 text-purple-300" />
              <span>Explain & Learn (Tutor)</span>
            </button>

            <button
              onClick={() => setActiveTab('safety')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeTab === 'safety'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Safety & Thermal</span>
            </button>

            <button
              onClick={() => setActiveTab('spice')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeTab === 'spice'
                  ? 'bg-slate-700 text-white border-slate-600 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>SPICE 3f5 Netlist</span>
            </button>
          </div>

          {/* Tab Contents */}
          {activeTab === 'breadboard' && (
            <BreadboardView
              resistance={resistance}
              voltage={voltage}
              simulation={simulation}
              components={components}
              switchState={switchState}
              onToggleSwitch={handleToggleSwitch}
              ledColor={ledColor}
              onVoltageChange={handleVoltageChange}
              onResistanceChange={handleResistanceChange}
              onSelectColor={handleSelectColor}
              onBridgeAllGaps={handleBridgeAllGaps}
              onLoadPreset={() => handleScanPreset('preset_gap')}
              uncertainGaps={uncertainGaps}
              bridgedGaps={bridgedGaps}
              hasSketch={Boolean(originalImage)}
              logicInputs={logicInputs}
              onToggleLogicPin={handleToggleLogicPin}
              connections={connections}
            />
          )}

          {activeTab === 'pcb' && (
            <PcbBlueprint
              voltage={voltage}
              resistance={resistance}
              simulation={simulation}
              ledColor={ledColor}
            />
          )}

          {activeTab === 'benchmark' && (
            <BenchmarkDashboard />
          )}

          {activeTab === 'diff' && (
            <TopologyDiffViewer
              uncertainGaps={uncertainGaps}
              bridgedGaps={bridgedGaps}
              simulation={simulation}
              voltage={voltage}
              resistance={resistance}
              onBridgeGap={handleBridgeGap}
              onUnbridgeGap={handleUnbridgeGap}
            />
          )}

          {activeTab === 'ambiguity' && (
            <AmbiguityLab
              activeInterpretation={activeInterpretation}
              onSelectInterpretation={setActiveInterpretation}
            />
          )}

          {activeTab === 'telemetry' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Multimeter simulation={simulation} />
              <Oscilloscope
                simulation={simulation}
                switchState={switchState}
                signalMode={signalMode}
                pwmDuty={pwmDuty}
                acFreq={acFreq}
              />
            </div>
          )}

          {activeTab === 'tutor' && (
            <CircuitTutor
              simulation={simulation}
              resistance={resistance}
              voltage={voltage}
            />
          )}

          {activeTab === 'safety' && (
            <FaultDiagnostics simulation={simulation} resistance={resistance} />
          )}

          {activeTab === 'spice' && (
            <SpiceViewer spiceNetlist={spiceNetlist} />
          )}
        </div>
      </main>

      {/* Floating AI Copilot Trigger Button */}
      <button
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-30 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-2xl shadow-indigo-500/40 hover:scale-105 transition-all ring-2 ring-cyan-400/50"
      >
        <Bot className="w-4 h-4 animate-bounce" />
        <span>PaperSPICE AI Copilot</span>
      </button>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        PaperSPICE • Built for Banana Hacks 2026 • Verified Image AI Electronics Simulation Engine
      </footer>

      {/* Modals & Drawers */}
      <WebcamModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={(blob) => handleBlobScan(blob, 'webcam.jpg')}
      />

      <DoodleCanvasModal
        isOpen={isDrawOpen}
        onClose={() => setIsDrawOpen(false)}
        onDrawComplete={(blob) => handleBlobScan(blob, 'doodle.png')}
      />

      <ComponentInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        components={components}
        connections={connections}
      />

      <LabReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        simulation={simulation}
        voltage={voltage}
        resistance={resistance}
        spiceNetlist={spiceNetlist}
        ledColor={ledColor}
      />

      <GuidedTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onStepAction={handleTourStepAction}
      />

      <AiCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        simulation={simulation}
        voltage={voltage}
        resistance={resistance}
        switchState={switchState}
      />
    </div>
  );
}
