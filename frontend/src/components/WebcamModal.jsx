import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

export default function WebcamModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720 } })
        .then((s) => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          alert("Camera access denied or unavailable. You can still upload photos directly!");
          onClose();
        });
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleCapture = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          snapFrame();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const snapFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        onClose();
      }
    }, 'image/jpeg', 0.90);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100">Live Paper Sketch Scanner</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {countdown && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-6xl font-black text-cyan-400 animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {/* Guide Overlay */}
          <div className="absolute inset-6 border-2 border-dashed border-cyan-500/40 rounded-xl pointer-events-none flex items-center justify-center">
            <span className="text-xs text-cyan-400/80 bg-slate-950/80 px-2 py-1 rounded">
              Center hand-drawn circuit inside frame
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Hold paper flat with good lighting
          </p>
          <div className="flex gap-2">
            <button
              onClick={snapFrame}
              disabled={countdown !== null}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Instant Capture</span>
            </button>
            <button
              onClick={handleCapture}
              disabled={countdown !== null}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>3s Timer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
