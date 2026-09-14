import React from 'react';
import { GameMode, GameStatus, ActivePowerup } from '../types';
import { Volume2, VolumeX, Pause, Play, Sparkles, Flame, Snowflake, Zap, Trophy } from 'lucide-react';

interface GameHUDProps {
  score: number;
  highScore: number;
  strikes: number;
  maxStrikes: number;
  mode: GameMode;
  status: GameStatus;
  timeLeft: number;
  activePowerups: ActivePowerup[];
  isMuted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onOpenBladeModal: () => void;
  onOpenExhibitionModal: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  highScore,
  strikes,
  maxStrikes,
  mode,
  status,
  timeLeft,
  activePowerups,
  isMuted,
  onToggleMute,
  onTogglePause,
  onOpenBladeModal,
  onOpenExhibitionModal,
}) => {
  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none p-4 md:p-6 flex flex-col justify-between select-none z-10">
      <div className="flex items-start justify-between w-full">
        {/* Left: Score & High Score */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl md:text-4xl">🍉</span>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider text-amber-200/70 font-semibold">Score</span>
                <span className="text-4xl md:text-5xl font-marker text-amber-400 drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]">
                  {score}
                </span>
              </div>
            </div>

            {/* Mode Tag */}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-black/40 border border-amber-500/30 text-amber-300">
              {mode}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-stone-400 pl-11">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Best: <strong className="text-stone-200">{highScore}</strong></span>
          </div>
        </div>

        {/* Center: Timer or Active Powerups */}
        <div className="flex flex-col items-center gap-2">
          {mode !== 'classic' && (
            <div
              className={`px-4 py-1.5 rounded-xl border font-marker text-2xl md:text-3xl flex items-center gap-2 transition-all ${
                timeLeft <= 10
                  ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse scale-105'
                  : 'bg-black/50 border-stone-700 text-stone-200'
              }`}
            >
              <span>⏱</span>
              <span>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Active Powerups Row */}
          {activePowerups.length > 0 && (
            <div className="flex items-center gap-2">
              {activePowerups.map((p) => {
                const pct = (p.timeLeft / p.maxDuration) * 100;
                return (
                  <div
                    key={p.type}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 border border-white/20 text-xs font-bold shadow-lg"
                  >
                    {p.type === 'freeze' && <Snowflake className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                    {p.type === 'frenzy' && <Flame className="w-3.5 h-3.5 text-purple-400 animate-bounce" />}
                    {p.type === 'double' && <Zap className="w-3.5 h-3.5 text-yellow-400" />}
                    <span className="uppercase tracking-wide text-stone-200">{p.type}</span>
                    <div className="w-10 h-1.5 bg-stone-800 rounded-full overflow-hidden ml-1">
                      <div
                        className={`h-full transition-all duration-100 ${
                          p.type === 'freeze'
                            ? 'bg-cyan-400'
                            : p.type === 'frenzy'
                            ? 'bg-purple-400'
                            : 'bg-yellow-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Strikes (in Classic) and Actions */}
        <div className="flex flex-col items-end gap-3">
          {/* Strikes in Classic Mode */}
          {mode === 'classic' && (
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-stone-800">
              {Array.from({ length: maxStrikes }).map((_, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-marker text-lg transition-transform ${
                    i < strikes
                      ? 'bg-red-900/80 text-red-500 border border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.6)] scale-110'
                      : 'bg-stone-900/60 text-stone-700 border border-stone-800'
                  }`}
                >
                  X
                </div>
              ))}
            </div>
          )}

          {/* Quick HUD Action Buttons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onOpenBladeModal}
              title="Customize Blade Style"
              className="p-2 rounded-xl bg-black/50 hover:bg-black/80 border border-stone-700/80 hover:border-amber-500/60 text-amber-300 transition-colors shadow-md"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-2 rounded-xl bg-black/50 hover:bg-black/80 border border-stone-700/80 hover:border-stone-500 text-stone-300 transition-colors shadow-md"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {status !== 'idle' && (
              <button
                onClick={onTogglePause}
                title={status === 'paused' ? 'Resume Game' : 'Pause Game'}
                className="p-2 rounded-xl bg-black/50 hover:bg-black/80 border border-stone-700/80 hover:border-stone-500 text-stone-300 transition-colors shadow-md"
              >
                {status === 'paused' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onOpenExhibitionModal}
              title="Project Proposal & Architecture"
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-600/40 text-amber-200 text-xs font-semibold tracking-wide transition-colors shadow-md flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Exhibit Info</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
