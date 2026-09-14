import React, { useEffect } from 'react';
import { Trophy, RotateCcw, Award, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  highScore: number;
  isNewHigh: boolean;
  maxCombo: number;
  slicedCount: number;
  slicedFruitStats: Record<string, number>;
  onRestart: () => void;
  onChangeMode: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  highScore,
  isNewHigh,
  maxCombo,
  slicedCount,
  onRestart,
  onChangeMode,
}) => {
  useEffect(() => {
    if (isOpen && isNewHigh) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'],
      });
    }
  }, [isOpen, isNewHigh]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-stone-950 border border-stone-800 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col items-center text-center gap-6">
        {/* Title */}
        <div className="flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-marker text-rose-500 tracking-wider drop-shadow-[0_4px_12px_rgba(244,63,94,0.4)]">
            GAME OVER
          </h2>
          {isNewHigh && (
            <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold animate-bounce">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>NEW PERSONAL HIGH SCORE!</span>
            </div>
          )}
        </div>

        {/* Big Score Display */}
        <div className="flex flex-col items-center justify-center w-full py-4 rounded-2xl bg-stone-900/60 border border-stone-800">
          <span className="text-xs uppercase tracking-widest text-stone-400 font-semibold">Total Sliced Score</span>
          <span className="text-6xl md:text-7xl font-marker text-amber-400 my-1 drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            {score}
          </span>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>High Score: <strong className="text-stone-200">{highScore}</strong></span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="flex flex-col items-center p-3 rounded-xl bg-stone-900/40 border border-stone-800/80">
            <div className="flex items-center gap-1 text-stone-400 text-xs mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fruits Sliced</span>
            </div>
            <span className="text-2xl font-bold font-mono text-stone-100">{slicedCount}</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-stone-900/40 border border-stone-800/80">
            <div className="flex items-center gap-1 text-stone-400 text-xs mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Max Combo</span>
            </div>
            <span className="text-2xl font-bold font-mono text-stone-100">{maxCombo}x</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-2.5 pt-2">
          <button
            onClick={onRestart}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <RotateCcw className="w-5 h-5 stroke-[2.5]" />
            <span>Play Again</span>
          </button>

          <button
            onClick={onChangeMode}
            className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-semibold text-sm transition-colors border border-stone-800"
          >
            Change Mode
          </button>
        </div>
      </div>
    </div>
  );
};
