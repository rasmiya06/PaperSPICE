import React, { useState } from 'react';
import { Terminal, Copy, Download, Check } from 'lucide-react';

export default function SpiceViewer({ spiceNetlist }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!spiceNetlist) return;
    navigator.clipboard.writeText(spiceNetlist);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!spiceNetlist) return;
    const blob = new Blob([spiceNetlist], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paperspice_circuit.cir';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Exported SPICE 3f5 Netlist
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .cir</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto max-h-56">
          {spiceNetlist || '* No SPICE netlist generated yet'}
        </pre>
      </div>
    </div>
  );
}
