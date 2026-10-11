import React, { useState } from 'react';
import { Eye, Layers, AlertTriangle, CheckCircle2, Link2, Unlink, Sparkles, Upload, PenTool, X, Camera, Zap } from 'lucide-react';
import { circuitAudio } from '../utils/audio';

export default function PerceptionViewer({
  originalImage,
  overlayImage,
  uncertainGaps = [],
  bridgedGaps = [],
  selectedPresetTitle = null,
  onBridgeGap,
  onUnbridgeGap,
  onBridgeAllGaps,
  onLoadHeroPreset,
  onOpenDraw,
  onOpenUpload,
  onOpenWebcam,
  onClear
}) {
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay' | 'original'
  const hasImage = Boolean(originalImage);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Top Bar */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Perception & Proof-of-Detection
          </h2>
          {hasImage && selectedPresetTitle && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              Demo Sample
            </span>
          )}
        </div>

        {hasImage ? (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode('overlay')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'overlay'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Diagnostic Overlay
              </button>
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'original'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Raw Paper Ink
              </button>
            </div>

            <button
              onClick={onClear}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-slate-700 hover:border-rose-800 text-xs flex items-center gap-1 transition-colors"
              title="Clear sketch and start fresh"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 font-mono">
            No sketch loaded
          </span>
        )}
      </div>

      {/* Image Display Area */}
      <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-4 overflow-hidden min-h-[350px]">
        {hasImage ? (
          viewMode === 'overlay' && overlayImage ? (
            <img
              src={`data:image/jpeg;base64,${overlayImage}`}
              alt="PaperSPICE Proof of Perception"
              className="max-h-full max-w-full object-contain rounded-lg border border-slate-800 shadow-lg"
            />
          ) : (
            <img
              src={`data:image/jpeg;base64,${originalImage}`}
              alt="Original Paper Sketch"
              className="max-h-full max-w-full object-contain rounded-lg border border-slate-800 shadow-lg"
            />
          )
        ) : (
          /* Clean, Inviting Ingestion Dropzone */
          <div className="w-full max-w-md p-6 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 text-center space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Upload or Draw Your Circuit
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Take a photo of your paper notebook sketch, use your webcam, or draw directly with the doodle pad.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                onClick={onOpenUpload}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/25 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>

              <button
                onClick={onOpenWebcam}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Webcam</span>
              </button>

              <button
                onClick={onOpenDraw}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                <span>Doodle Pad</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={onLoadHeroPreset}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Or click to test with Hero Demo Sample (30px Gap)</span>
              </button>
            </div>
          </div>
        )}

        {/* Legend Tag */}
        {hasImage && viewMode === 'overlay' && overlayImage && (
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/80 text-[11px] text-slate-300 flex flex-wrap gap-3 shadow-lg">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Battery
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> Switch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Resistor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> LED
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span> Wire Gap
            </span>
          </div>
        )}
      </div>

      {/* Uncertainty Gate Active Alerts Panel */}
      <div className="border-t border-slate-800 bg-slate-900/90 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${!hasImage ? 'text-slate-500' : uncertainGaps.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Uncertainty Gate Status
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {hasImage && uncertainGaps.length > 1 && (
              <button
                onClick={onBridgeAllGaps}
                className="px-2.5 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold shadow-sm transition-all"
              >
                Bridge All Gaps
              </button>
            )}

            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              !hasImage
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : uncertainGaps.length === 0
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}>
              {!hasImage ? 'Standby (No Sketch)' : uncertainGaps.length === 0 ? 'Topology 100% Verified' : `${uncertainGaps.length} Ambiguous Gap(s)`}
            </span>
          </div>
        </div>

        {!hasImage ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            <span>Standby. The Uncertainty Gate will analyze wire continuity once you upload or draw a circuit.</span>
          </div>
        ) : uncertainGaps.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All wire paths form continuous connected ink components. Zero ambiguous gaps detected.</span>
          </div>
        ) : (
          <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
            {uncertainGaps.map((gap) => {
              const isBridged = bridgedGaps.includes(gap.connection_id);
              return (
                <div
                  key={gap.connection_id}
                  className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                    isBridged
                      ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-1.5">
                      <span>{gap.source}</span>
                      <span className="text-slate-400">➔</span>
                      <span>{gap.target}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-amber-300 border border-amber-700/50">
                        {gap.gap_px}px gap
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {isBridged
                        ? '✓ Verified & Bridged by user. Conducting circuit.'
                        : gap.message}
                    </p>
                  </div>

                  <div>
                    {isBridged ? (
                      <button
                        onClick={() => onUnbridgeGap(gap.connection_id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onBridgeGap(gap.connection_id)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                      >
                        <Link2 className="w-3.5 h-3.5 text-slate-950" />
                        <span>Bridge Gap</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
