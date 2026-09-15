import React, { useRef, useEffect } from 'react';
import { VisionStats } from '../types';
import { Camera, CameraOff, ChevronDown, ChevronUp, Cpu, AlertCircle } from 'lucide-react';
import { HAND_CONNECTIONS, NormalizedLandmark } from '../utils/visionTracker';

interface VisionHUDProps {
  stats: VisionStats;
  isCameraActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onToggleCamera: () => void;
  pinchOnlyMode: boolean;
  onTogglePinchMode: () => void;
  allLandmarks: NormalizedLandmark[] | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const VisionHUD: React.FC<VisionHUDProps> = ({
  stats,
  isCameraActive,
  videoRef,
  onToggleCamera,
  pinchOnlyMode,
  onTogglePinchMode,
  allLandmarks,
  isExpanded,
  onToggleExpand,
}) => {
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw 21-hand landmark skeleton over video PIP
  useEffect(() => {
    const canvas = skeletonCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isCameraActive || !allLandmarks || allLandmarks.length < 21) {
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Draw landmark connections
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    HAND_CONNECTIONS.forEach(([i, j]) => {
      const p1 = allLandmarks[i];
      const p2 = allLandmarks[j];
      if (p1 && p2) {
        // Mirrored coordinate for webcam view
        const x1 = (1 - p1.x) * w;
        const y1 = p1.y * h;
        const x2 = (1 - p2.x) * w;
        const y2 = p2.y * h;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
    });
    ctx.stroke();

    // Draw landmark points
    allLandmarks.forEach((lm, idx) => {
      const x = (1 - lm.x) * w;
      const y = lm.y * h;

      ctx.beginPath();
      // Highlight Landmark 8 (Index blade) in bright amber/yellow
      if (idx === 8) {
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ffea00';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (idx === 4) {
        // Highlight Landmark 4 (Thumb) in magenta
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff007f';
        ctx.fill();
      } else {
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
      }
    });
  }, [allLandmarks, isCameraActive]);

  return (
    <div className="absolute bottom-4 left-4 z-30 pointer-events-auto flex flex-col items-start gap-2 max-w-sm">
      {/* Video PIP Feed & Skeleton overlay (always kept mounted, hidden if not active) */}
      <div
        className={`relative rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl bg-black/90 transition-all ${
          !isCameraActive
            ? 'w-0 h-0 border-0 opacity-0 pointer-events-none p-0 m-0 overflow-hidden'
            : isExpanded
            ? 'w-64 h-48 opacity-100'
            : 'w-44 h-32 opacity-100'
        }`}
      >
        {/* Real Webcam video element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover transform -scale-x-100 opacity-80"
        />

        {/* Real-time Hand Skeleton Canvas */}
        <canvas
          ref={skeletonCanvasRef}
          width={isExpanded ? 256 : 176}
          height={isExpanded ? 192 : 128}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />


        {/* Toggle Expand PIP */}
        <button
          onClick={onToggleExpand}
          title={isExpanded ? 'Minimize Camera Feed' : 'Expand Camera Feed'}
          className="absolute top-2 right-2 p-1 rounded bg-black/70 hover:bg-black/90 text-cyan-300 transition-colors border border-cyan-500/30"
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>


      </div>

      {/* Control Bar & Telemetry Panel */}
      <div className="flex flex-col gap-2.5 bg-stone-950/90 backdrop-blur-md p-3.5 rounded-2xl border border-stone-800 shadow-2xl w-full">
        <div className="flex items-center justify-between gap-3">
          {/* Camera On / Off button */}
          <button
            onClick={onToggleCamera}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-md cursor-pointer ${
              isCameraActive
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30 ring-1 ring-cyan-500/40'
                : 'bg-amber-500/25 text-amber-200 border border-amber-500/60 hover:bg-amber-500/40 ring-1 ring-amber-500/40'
            }`}
          >
            {isCameraActive ? (
              <>
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Webcam: TRACKING</span>
              </>
            ) : (
              <>
                <CameraOff className="w-4 h-4 text-amber-400" />
                <span>Enable Hand Tracking</span>
              </>
            )}
          </button>

          {/* FPS Badge */}
          <div className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-lg bg-black/60 border border-stone-800 text-stone-300">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>{stats.fps} FPS</span>
          </div>
        </div>

        {/* Input Mode Info */}
        {isCameraActive && (
          <div className="flex items-center justify-end pt-1 border-t border-stone-800/80">
            <button
              onClick={onTogglePinchMode}
              title="Toggle whether blade cuts continuously with index finger or only when pinching thumb & index"
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                pinchOnlyMode
                  ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                  : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              {pinchOnlyMode ? 'Pinch Mode: ON' : 'Free Motion Blade'}
            </button>
          </div>
        )}

        {/* Camera error notification if any */}
        {stats.cameraError && (
          <div className="flex items-start gap-1.5 text-[11px] text-rose-300 bg-rose-950/70 p-2 rounded-lg border border-rose-800/60 mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <span>{stats.cameraError} — You can still swipe with mouse/touch!</span>
          </div>
        )}
      </div>
    </div>
  );
};
