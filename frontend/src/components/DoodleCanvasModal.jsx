import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Eraser, Trash2, Check, X } from 'lucide-react';

export default function DoodleCanvasModal({ isOpen, onClose, onDrawComplete }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState('pen'); // 'pen' | 'eraser'
  const [lineWidth, setLineWidth] = useState(4);

  useEffect(() => {
    if (isOpen) {
      setTimeout(initCanvas, 50);
    }
  }, [isOpen]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Cream notebook paper background
    ctx.fillStyle = '#f8f6f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle graph grid lines
    ctx.strokeStyle = '#e2ded5';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Guide Hints (faint watermarks)
    ctx.fillStyle = 'rgba(150, 150, 160, 0.25)';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('Battery [Left]', 40, canvas.height / 2);
    ctx.fillText('Switch [Top]', canvas.width / 2 - 35, 40);
    ctx.fillText('Resistor [Right]', canvas.width - 120, canvas.height / 2);
    ctx.fillText('LED [Bottom]', canvas.width / 2 - 35, canvas.height - 30);
  };

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = mode === 'pen' ? '#1e293b' : '#f8f6f0';
    ctx.lineWidth = mode === 'pen' ? lineWidth : 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const handleFinish = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onDrawComplete(blob);
        onClose();
      }
    }, 'image/png');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100">Live Paper Sketchpad</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('pen')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                mode === 'pen' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Ink Pen</span>
            </button>
            <button
              onClick={() => setMode('eraser')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                mode === 'eraser' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={initCanvas}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative rounded-xl overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center bg-slate-950">
          <canvas
            ref={canvasRef}
            width={640}
            height={440}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            className="cursor-crosshair shadow-lg"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Doodle your loop: Battery on left, Switch on top, Resistor on right, LED on bottom.
          </p>
          <button
            onClick={handleFinish}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Scan & Simulate</span>
          </button>
        </div>
      </div>
    </div>
  );
}
