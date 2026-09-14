import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameMode,
  GameStatus,
  BladeStyle,
  VisionStats,
  ActivePowerup,
} from './types';
import { BLADE_STYLES } from './utils/fruitData';
import { visionTracker, NormalizedLandmark } from './utils/visionTracker';
import { sound } from './utils/audio';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { VisionHUD } from './components/VisionHUD';
import { BladeCustomizer } from './components/BladeCustomizer';
import { GameOverModal } from './components/GameOverModal';
import { ExhibitionModal } from './components/ExhibitionModal';
import { Sparkles, Award, Play, ShieldAlert, Zap, Heart } from 'lucide-react';

export default function App() {
  // Game State
  const [status, setStatus] = useState<GameStatus>('idle');
  const [mode, setMode] = useState<GameMode>('classic');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [strikes, setStrikes] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [activePowerups, setActivePowerups] = useState<ActivePowerup[]>([]);
  const [selectedBlade, setSelectedBlade] = useState<BladeStyle>(BLADE_STYLES[0]);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Statistics
  const [slicedCount, setSlicedCount] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(1);
  const [slicedFruitStats, setSlicedFruitStats] = useState<Record<string, number>>({});

  // Modals
  const [isBladeModalOpen, setIsBladeModalOpen] = useState<boolean>(false);
  const [isExhibitionModalOpen, setIsExhibitionModalOpen] = useState<boolean>(false);
  const [isPipExpanded, setIsPipExpanded] = useState<boolean>(false);

  // Vision Pipeline & Webcam State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [pinchOnlyMode, setPinchOnlyMode] = useState<boolean>(false);
  const [smoothingFactor, setSmoothingFactor] = useState<number>(0.75);
  const [bladeInputPos, setBladeInputPos] = useState<{ x: number; y: number } | null>(null);
  const [allLandmarks, setAllLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [visionStats, setVisionStats] = useState<VisionStats>({
    fps: 60,
    isTracking: false,
    handDetected: false,
    landmarkCount: 0,
    indexFinger: null,
    thumbFinger: null,
    pinchDistance: 0,
    isPinching: false,
    detectionConfidence: 0,
    cameraActive: false,
    cameraError: null,
    inputMode: 'mouse',
  });

  // Load high score for mode
  useEffect(() => {
    const saved = localStorage.getItem(`fruit_ninja_high_${mode}`);
    if (saved) {
      setHighScore(parseInt(saved, 10) || 0);
    } else {
      setHighScore(0);
    }
  }, [mode]);

  // Handle Score Updates
  const handleScoreUpdate = useCallback(
    (points: number, comboCount: number) => {
      setScore((prev) => {
        const nextScore = Math.max(0, prev + points);
        if (nextScore > highScore) {
          setHighScore(nextScore);
          setIsNewHigh(true);
          localStorage.setItem(`fruit_ninja_high_${mode}`, nextScore.toString());
        }
        return nextScore;
      });

      if (comboCount > maxCombo) {
        setMaxCombo(comboCount);
      }
    },
    [highScore, maxCombo, mode]
  );

  // Handle Fruit Sliced Stats
  const handleFruitSliced = useCallback((fruitType: string) => {
    setSlicedCount((prev) => prev + 1);
    setSlicedFruitStats((prev) => ({
      ...prev,
      [fruitType]: (prev[fruitType] || 0) + 1,
    }));
  }, []);

  // Handle Strike (missed fruit in Classic)
  const handleStrike = useCallback(() => {
    if (mode !== 'classic' || status !== 'playing') return;
    setStrikes((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        sound.playGameOver();
        setStatus('gameover');
      }
      return next;
    });
  }, [mode, status]);

  // Handle Game Over
  const handleGameOver = useCallback(() => {
    sound.playGameOver();
    setStatus('gameover');
  }, []);

  // Activate Powerup (Freeze, Frenzy, Double)
  const handleActivatePowerup = useCallback((type: 'freeze' | 'frenzy' | 'double') => {
    setActivePowerups((prev) => {
      const filtered = prev.filter((p) => p.type !== type);
      return [...filtered, { type, timeLeft: 6, maxDuration: 6 }];
    });
  }, []);

  // Timer Tick for Arcade / Zen & Powerups
  useEffect(() => {
    if (status !== 'playing') return;

    const timer = setInterval(() => {
      // Game Countdown for Arcade/Zen
      if (mode === 'arcade' || mode === 'zen') {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleGameOver();
            return 0;
          }
          return prev - 1;
        });
      }

      // Active Powerup Timers
      setActivePowerups((prev) =>
        prev
          .map((p) => ({ ...p, timeLeft: p.timeLeft - 0.5 }))
          .filter((p) => p.timeLeft > 0)
      );
    }, 500);

    return () => clearInterval(timer);
  }, [status, mode, handleGameOver]);

  // Toggle Camera
  const handleToggleCamera = useCallback(async () => {
    if (isCameraActive) {
      visionTracker.stopCamera();
      setIsCameraActive(false);
      setBladeInputPos(null);
      setAllLandmarks(null);
      setVisionStats((prev) => ({
        ...prev,
        isTracking: false,
        cameraActive: false,
        handDetected: false,
        landmarkCount: 0,
        indexFinger: null,
        thumbFinger: null,
        cameraError: null,
        inputMode: 'mouse',
      }));
    } else {
      if (!videoRef.current) return;
      setVisionStats((prev) => ({
        ...prev,
        cameraError: null,
      }));
      const res = await visionTracker.startCamera(
        videoRef.current,
        (bladePos, stats, landmarks) => {
          setBladeInputPos(bladePos);
          setVisionStats(stats);
          setAllLandmarks(landmarks);
        },
        pinchOnlyMode
      );

      if (res.success) {
        setIsCameraActive(true);
      } else {
        setVisionStats((prev) => ({
          ...prev,
          cameraError: res.error || 'Failed to start camera',
        }));
      }
    }
  }, [isCameraActive, pinchOnlyMode]);

  // Automatic webcam & hand detection initialization without requiring manual click
  const hasAutoStartedRef = useRef<boolean>(false);
  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    const autoActivateTimer = setTimeout(async () => {
      if (!videoRef.current || isCameraActive) return;
      try {
        const res = await visionTracker.startCamera(
          videoRef.current,
          (bladePos, stats, landmarks) => {
            setBladeInputPos(bladePos);
            setVisionStats(stats);
            setAllLandmarks(landmarks);
          },
          pinchOnlyMode
        );

        if (res.success) {
          setIsCameraActive(true);
        } else {
          // If browser policy blocks autoplay before interaction, user can still click toggle
          setVisionStats((prev) => ({
            ...prev,
            cameraError: res.error || null,
          }));
        }
      } catch (err) {
        console.warn('Auto camera activation notice:', err);
      }
    }, 450);

    return () => clearTimeout(autoActivateTimer);
  }, [pinchOnlyMode, isCameraActive]);

  // Handle smoothing sensitivity change
  const handleSmoothingChange = (factor: number) => {
    setSmoothingFactor(factor);
    visionTracker.setSmoothingFactor(factor);
  };

  // Clean camera on unmount
  useEffect(() => {
    return () => {
      visionTracker.stopCamera();
    };
  }, []);

  // Start a new game
  const startGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setScore(0);
    setStrikes(0);
    setIsNewHigh(false);
    setSlicedCount(0);
    setMaxCombo(1);
    setSlicedFruitStats({});
    setActivePowerups([]);
    setTimeLeft(selectedMode === 'arcade' ? 60 : selectedMode === 'zen' ? 90 : 0);
    setStatus('playing');
    sound.playSwish();
  };

  // Toggle audio
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Toggle pause
  const handleTogglePause = () => {
    setStatus((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden wood-grain select-none">
      {/* 2D HTML5 Canvas Game Engine */}
      <GameCanvas
        mode={mode}
        status={status}
        bladeStyle={selectedBlade}
        bladeInputPos={bladeInputPos}
        onScoreUpdate={handleScoreUpdate}
        onStrike={handleStrike}
        onGameOver={handleGameOver}
        onFruitSliced={handleFruitSliced}
        activePowerups={activePowerups}
        onActivatePowerup={handleActivatePowerup}
      />

      {/* Top HUD */}
      <GameHUD
        score={score}
        highScore={highScore}
        strikes={strikes}
        maxStrikes={3}
        mode={mode}
        status={status}
        timeLeft={timeLeft}
        activePowerups={activePowerups}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onTogglePause={handleTogglePause}
        onOpenBladeModal={() => setIsBladeModalOpen(true)}
        onOpenExhibitionModal={() => setIsExhibitionModalOpen(true)}
      />

      {/* Bottom-Left Vision Pipeline HUD & Webcam Feed */}
      <VisionHUD
        stats={visionStats}
        isCameraActive={isCameraActive}
        videoRef={videoRef}
        onToggleCamera={handleToggleCamera}
        pinchOnlyMode={pinchOnlyMode}
        onTogglePinchMode={() => setPinchOnlyMode(!pinchOnlyMode)}
        allLandmarks={allLandmarks}
        isExpanded={isPipExpanded}
        onToggleExpand={() => setIsPipExpanded(!isPipExpanded)}
        smoothingFactor={smoothingFactor}
        onSmoothingChange={handleSmoothingChange}
      />

      {/* Main Menu Screen (Idle Status) */}
      {status === 'idle' && (
        <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col items-center justify-between p-6 md:p-10 bg-black/55 backdrop-blur-[2px]">
          {/* Top Title Banner */}
          <div className="flex flex-col items-center text-center mt-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3 tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Computer Vision Interactive Exhibit</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-marker text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_4px_16px_rgba(245,158,11,0.5)]">
              FRUIT NINJA
            </h1>
            <p className="text-stone-300 font-cinzel font-semibold tracking-wider text-sm md:text-base mt-2">
              REAL-TIME HAND-TRACKING POSE ESTIMATION
            </p>
          </div>

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl my-auto">
            {/* Classic Mode */}
            <button
              onClick={() => startGame('classic')}
              className="group relative p-6 rounded-3xl bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-amber-500/80 shadow-2xl transition-all transform hover:-translate-y-1.5 flex flex-col items-center text-center gap-3 text-stone-100"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🍉
              </div>
              <h3 className="font-marker text-2xl text-amber-300 tracking-wide">CLASSIC</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                3 strikes for dropped fruits. Slice as many fruits as possible. Watch out for lethal bombs!
              </p>
              <div className="mt-2 px-4 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md group-hover:bg-amber-400">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Classic</span>
              </div>
            </button>

            {/* Arcade Mode */}
            <button
              onClick={() => startGame('arcade')}
              className="group relative p-6 rounded-3xl bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-cyan-500/80 shadow-2xl transition-all transform hover:-translate-y-1.5 flex flex-col items-center text-center gap-3 text-stone-100"
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🍌
              </div>
              <h3 className="font-marker text-2xl text-cyan-300 tracking-wide">ARCADE</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                60-second frenzy! Slice special bananas for Freeze, Frenzy & Double Points. Bombs subtract points.
              </p>
              <div className="mt-2 px-4 py-1.5 rounded-xl bg-cyan-500 text-stone-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md group-hover:bg-cyan-400">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Play Arcade</span>
              </div>
            </button>

            {/* Zen Mode */}
            <button
              onClick={() => startGame('zen')}
              className="group relative p-6 rounded-3xl bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-emerald-500/80 shadow-2xl transition-all transform hover:-translate-y-1.5 flex flex-col items-center text-center gap-3 text-stone-100"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🍊
              </div>
              <h3 className="font-marker text-2xl text-emerald-300 tracking-wide">ZEN</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                90 seconds of peaceful slicing. No bombs, no strikes, pure relaxing rhythm and blade mastery.
              </p>
              <div className="mt-2 px-4 py-1.5 rounded-xl bg-emerald-500 text-stone-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md group-hover:bg-emerald-400">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Play Zen</span>
              </div>
            </button>
          </div>

          {/* Bottom Controls Guidance */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-stone-400">
            <div className="flex items-center gap-2 bg-stone-900/80 px-4 py-2 rounded-xl border border-stone-800">
              <span className="text-amber-400 font-bold">Webcam Mode:</span>
              <span>Enable AI Webcam to slice with Landmark 8 (Index Finger) in mid-air!</span>
            </div>
            <div className="flex items-center gap-2 bg-stone-900/80 px-4 py-2 rounded-xl border border-stone-800">
              <span className="text-cyan-400 font-bold">Mouse / Touch:</span>
              <span>Click & swipe or drag across screen on any device</span>
            </div>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {status === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-stone-950 border border-stone-800 shadow-2xl text-center">
            <h2 className="text-4xl font-marker text-amber-300">GAME PAUSED</h2>
            <p className="text-sm text-stone-400 max-w-xs">
              Take a breath, ninja. Ready your blade when you're prepared.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleTogglePause}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm tracking-wide shadow-md transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>
              <button
                onClick={() => setStatus('idle')}
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-semibold text-sm transition-colors border border-stone-800"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={status === 'gameover'}
        score={score}
        highScore={highScore}
        isNewHigh={isNewHigh}
        maxCombo={maxCombo}
        slicedCount={slicedCount}
        slicedFruitStats={slicedFruitStats}
        onRestart={() => startGame(mode)}
        onChangeMode={() => setStatus('idle')}
      />

      {/* Blade Armory Customizer */}
      <BladeCustomizer
        isOpen={isBladeModalOpen}
        onClose={() => setIsBladeModalOpen(false)}
        selectedBlade={selectedBlade}
        onSelectBlade={(blade) => setSelectedBlade(blade)}
      />

      {/* Engineer's Day Exhibition Info Modal */}
      <ExhibitionModal
        isOpen={isExhibitionModalOpen}
        onClose={() => setIsExhibitionModalOpen(false)}
      />
    </div>
  );
}
