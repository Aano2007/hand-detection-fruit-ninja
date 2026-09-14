import React from 'react';
import { X, Award, Cpu, BookOpen, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

interface ExhibitionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExhibitionModal: React.FC<ExhibitionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-950 border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(245,158,11,0.2)] flex flex-col gap-6 my-8 text-stone-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-800 pb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest">
              <Award className="w-4 h-4" />
              <span>Engineer's Day Exhibition Project Proposal</span>
            </div>
            <h2 className="text-2xl font-cinzel font-bold text-amber-200 mt-1">
              Hand-Tracking Fruit Ninja
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400 mt-2">
              <span><strong>Author:</strong> Aayan Maji</span>
              <span><strong>UID:</strong> 25BTCSE005</span>
              <span><strong>Institution:</strong> Rai University, Ahmedabad</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Summary */}
        <div className="bg-stone-900/60 p-4 rounded-2xl border border-stone-800 text-sm leading-relaxed text-stone-300">
          This project gamifies computer vision, utilizing real-time human pose estimation
          to translate physical hand movements into digital game interactions at 60 FPS.
        </div>

        {/* 4 Phases Breakdown */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>Implementation Architecture Phases</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Phase 1 */}
            <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Phase 1: Vision Pipeline</span>
              </div>
              <ul className="text-xs text-stone-400 space-y-1.5 list-disc list-inside">
                <li>Extracts 21 distinct 3D landmarks via MediaPipe Hands.</li>
                <li>Continuously tracks <strong>Landmark 8</strong> (Index Finger Tip) as the active cutting blade.</li>
                <li>Monitors Euclidean distance to <strong>Landmark 4</strong> (Thumb Tip) for pinch-cutting mechanics.</li>
              </ul>
            </div>

            {/* Phase 2 */}
            <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Phase 2: Game Engine</span>
              </div>
              <ul className="text-xs text-stone-400 space-y-1.5 list-disc list-inside">
                <li>Object-oriented Fruit physics storing coordinates and velocity vectors.</li>
                <li>Applies continuous downward gravitational constant (vel_y += gravity).</li>
                <li>Dynamic spawner instantiating tossing motions with negative Y-velocity.</li>
              </ul>
            </div>

            {/* Phase 3 */}
            <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Phase 3: Sword Trail</span>
              </div>
              <ul className="text-xs text-stone-400 space-y-1.5 list-disc list-inside">
                <li>Dynamically sized history queue storing historical finger coordinates.</li>
                <li>Renders glowing, tapered line segment with custom blade styles.</li>
                <li>Pops oldest coordinates creating a natural velocity-fading trail.</li>
              </ul>
            </div>

            {/* Phase 4 */}
            <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Phase 4: Collision Detection</span>
              </div>
              <ul className="text-xs text-stone-400 space-y-1.5 list-disc list-inside">
                <li>Solves the <strong>frame-skip / tunneling issue</strong> using line-circle segment intersections.</li>
                <li>Evaluates segments between consecutive frames against fruit hitboxes.</li>
                <li>Triggers particle fireworks, juicy splatters, and sliced halves with spin physics.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tech Stack Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-800">
          <span className="px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 text-xs font-mono">
            MediaPipe Hands (21 Landmarks)
          </span>
          <span className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-mono">
            HTML5 60 FPS Physics Engine
          </span>
          <span className="px-3 py-1 rounded-lg bg-purple-950/60 border border-purple-700/50 text-purple-300 text-xs font-mono">
            Web Audio Synthesizer
          </span>
          <span className="px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-700/50 text-amber-300 text-xs font-mono">
            React 19 & Tailwind
          </span>
        </div>

        {/* Close button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-sm transition-colors"
          >
            Back to Dojo
          </button>
        </div>
      </div>
    </div>
  );
};
