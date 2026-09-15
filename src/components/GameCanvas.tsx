import React, { useEffect, useRef, useCallback } from 'react';
import {
  Fruit,
  SlicedHalf,
  Particle,
  JuiceSplatter,
  BladePoint,
  FloatingText,
  ActivePowerup,
  BladeStyle,
  GameMode,
  GameStatus,
} from '../types';
import { FRUIT_CONFIGS } from '../utils/fruitData';
import { lineIntersectsCircle, Point, distance, relaxTrailPoints, generateCurvingThread, generateScrambledCut } from '../utils/geometry';
import { sound } from '../utils/audio';

interface GameCanvasProps {
  mode: GameMode;
  status: GameStatus;
  bladeStyle: BladeStyle;
  bladeInputPos: { x: number; y: number } | null;
  bladeInputPosRef: React.RefObject<{ x: number; y: number } | null>;
  onScoreUpdate: (points: number, comboCount: number) => void;
  onStrike: () => void;
  onGameOver: () => void;
  onFruitSliced: (fruitType: string) => void;
  activePowerups: ActivePowerup[];
  onActivatePowerup: (type: 'freeze' | 'frenzy' | 'double') => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mode,
  status,
  bladeStyle,
  bladeInputPos,
  bladeInputPosRef,
  onScoreUpdate,
  onStrike,
  onGameOver,
  onFruitSliced,
  activePowerups,
  onActivatePowerup,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game entities refs
  const fruitsRef = useRef<Fruit[]>([]);
  const halvesRef = useRef<SlicedHalf[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const splattersRef = useRef<JuiceSplatter[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const bladeTrailRef = useRef<BladePoint[]>([]);

  // Combo tracking
  const strokeCutFruitsRef = useRef<{ id: string; time: number }[]>([]);
  const lastSliceTimeRef = useRef<number>(0);

  // Spawning & timers
  const lastSpawnTimeRef = useRef<number>(0);
  const nextSpawnIntervalRef = useRef<number>(800);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const screenShakeRef = useRef<number>(0);

  // Mouse / Touch interaction fallback
  const isPointerDownRef = useRef<boolean>(false);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Spawns a fruit or cluster
  const spawnFruit = useCallback((forceSpecial?: 'freeze' | 'frenzy' | 'double') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Normal fruit selection
    const normalTypes = ['watermelon', 'orange', 'banana', 'apple', 'strawberry', 'pineapple', 'coconut'];
    let chosenType: string;

    if (forceSpecial) {
      chosenType = `${forceSpecial}_banana`;
    } else if (mode === 'arcade' && Math.random() < 0.14) {
      // Special banana in arcade
      const specials = ['freeze_banana', 'frenzy_banana', 'double_banana'];
      chosenType = specials[Math.floor(Math.random() * specials.length)];
    } else if (mode !== 'zen' && Math.random() < 0.18) {
      // Bomb in classic or arcade
      chosenType = 'bomb';
    } else {
      chosenType = normalTypes[Math.floor(Math.random() * normalTypes.length)];
    }

    const config = FRUIT_CONFIGS[chosenType] || FRUIT_CONFIGS['watermelon'];

    // Launch coordinates: lower screen, inwards angle
    const spawnX = width * 0.12 + Math.random() * (width * 0.76);
    const spawnY = height + 35;

    // Direct trajectory towards screen center with challenging yet fair arcade velocity
    const targetCenterX = width * 0.5 + (Math.random() - 0.5) * (width * 0.42);
    // Toss height covers 60% to 80% of screen height (comfortable reaction window)
    const targetPeakHeight = height * (0.22 + Math.random() * 0.18);
    const targetTossDistance = spawnY - targetPeakHeight;
    // v = sqrt(2 * g * h) where g is gravity (0.36) for clean, readable flight arcs
    const tossGravity = 0.36;
    const tossPower = Math.sqrt(2 * tossGravity * targetTossDistance) * (0.96 + Math.random() * 0.08);
    const timeToPeak = tossPower / tossGravity;
    const targetVx = (targetCenterX - spawnX) / timeToPeak;

    const newFruit: Fruit = {
      id: Math.random().toString(36).substring(2, 9),
      type: config.type,
      name: config.name,
      x: spawnX,
      y: spawnY,
      vx: targetVx,
      vy: -tossPower,
      radius: config.radius,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.12,
      isSliced: false,
      isBomb: config.isBomb,
      isSpecial: config.isSpecial,
      specialType: config.specialType,
      points: config.points,
      color: config.color,
      innerColor: config.innerColor,
      rindColor: config.rindColor,
    };

    fruitsRef.current.push(newFruit);
  }, [mode]);

  // Handle fruit slicing
  const handleSlice = useCallback(
    (fruit: Fruit, sliceAngle: number, impactPoint: Point) => {
      fruit.isSliced = true;
      onFruitSliced(fruit.type);

      // Bomb trigger
      if (fruit.isBomb) {
        sound.playBombExplosion();
        screenShakeRef.current = 24;

        // Bomb sparks
        for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 8 + 3;
          particlesRef.current.push({
            x: impactPoint.x,
            y: impactPoint.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: Math.random() > 0.5 ? '#ff3d00' : '#ffea00',
            size: Math.random() * 5 + 3,
            life: 0,
            maxLife: 35 + Math.random() * 20,
            shape: 'spark',
          });
        }

        if (mode === 'classic') {
          onGameOver();
        } else if (mode === 'arcade') {
          // In arcade mode, bomb deducts 10 points
          onScoreUpdate(-10, 0);
          floatingTextsRef.current.push({
            id: Math.random().toString(),
            text: '-10 BOMB!',
            x: fruit.x,
            y: fruit.y - 20,
            vy: -1.5,
            alpha: 1,
            scale: 1.3,
            color: '#ff1744',
          });
        }
        return;
      }

      // Play juicy sound
      sound.playJuicySlice(0.85 + Math.random() * 0.35);

      // Special powerup banana checks
      if (fruit.isSpecial && fruit.specialType) {
        onActivatePowerup(fruit.specialType);
        sound.playPowerup(fruit.specialType);
        floatingTextsRef.current.push({
          id: Math.random().toString(),
          text: `${fruit.specialType.toUpperCase()}!`,
          x: fruit.x,
          y: fruit.y - 30,
          vy: -2,
          alpha: 1,
          scale: 1.5,
          color: fruit.color,
        });
      }

      // Generate scrambled cut geometry passing through the exact impact / touch point
      const cutData = generateScrambledCut(
        { x: fruit.x, y: fruit.y },
        fruit.radius,
        impactPoint,
        sliceAngle,
        14
      );

      // Sliced Halves Physics
      const normalAngle = sliceAngle + Math.PI / 2;
      const spreadSpeed = 3.8 + Math.random() * 2.2;

      // Left half (pushed along negative normal)
      halvesRef.current.push({
        id: Math.random().toString(),
        type: fruit.type,
        x: fruit.x - Math.cos(normalAngle) * 7,
        y: fruit.y - Math.sin(normalAngle) * 7,
        vx: fruit.vx - Math.cos(normalAngle) * spreadSpeed,
        vy: fruit.vy - Math.sin(normalAngle) * spreadSpeed - 2,
        rotation: fruit.rotation,
        vRot: fruit.vRot - (0.07 + Math.random() * 0.05),
        sliceAngle,
        isLeftHalf: true,
        radius: fruit.radius,
        color: fruit.color,
        innerColor: fruit.innerColor,
        rindColor: fruit.rindColor,
        life: 0,
        cutOffset: cutData.cutOffset,
        scrambledPoints: cutData.scrambledPoints,
      });

      // Right half (pushed along positive normal)
      halvesRef.current.push({
        id: Math.random().toString(),
        type: fruit.type,
        x: fruit.x + Math.cos(normalAngle) * 7,
        y: fruit.y + Math.sin(normalAngle) * 7,
        vx: fruit.vx + Math.cos(normalAngle) * spreadSpeed,
        vy: fruit.vy + Math.sin(normalAngle) * spreadSpeed - 2,
        rotation: fruit.rotation,
        vRot: fruit.vRot + (0.07 + Math.random() * 0.05),
        sliceAngle,
        isLeftHalf: false,
        radius: fruit.radius,
        color: fruit.color,
        innerColor: fruit.innerColor,
        rindColor: fruit.rindColor,
        life: 0,
        cutOffset: cutData.cutOffset,
        scrambledPoints: cutData.scrambledPoints,
      });

      // Extra touch-point burst sparks
      for (let s = 0; s < 8; s++) {
        const a = Math.random() * Math.PI * 2;
        const spd = Math.random() * 4 + 2;
        particlesRef.current.push({
          x: impactPoint.x,
          y: impactPoint.y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 1.5,
          color: '#ffffff',
          size: Math.random() * 2.5 + 1.5,
          life: 0,
          maxLife: 16,
          shape: 'spark',
        });
      }

      // Juice Splatter on Dojo background
      if (Math.random() < 0.75) {
        const drops = [];
        const dropCount = Math.floor(Math.random() * 7) + 5;
        for (let d = 0; d < dropCount; d++) {
          const r = Math.random() * 35;
          const a = Math.random() * Math.PI * 2;
          drops.push({
            x: Math.cos(a) * r,
            y: Math.sin(a) * r,
            r: Math.random() * 5 + 2,
          });
        }
        splattersRef.current.push({
          id: Math.random().toString(),
          x: fruit.x,
          y: fruit.y,
          radius: fruit.radius * 0.9,
          color: fruit.innerColor,
          alpha: 0.65,
          drops,
          createdAt: performance.now(),
        });
        if (splattersRef.current.length > 25) {
          splattersRef.current.shift();
        }
      }

      // Juice droplets & sparks particles
      const pCount = 18;
      for (let p = 0; p < pCount; p++) {
        const pAngle = sliceAngle + (Math.random() - 0.5) * 1.5;
        const pSpeed = Math.random() * 7 + 2;
        particlesRef.current.push({
          x: impactPoint.x,
          y: impactPoint.y,
          vx: Math.cos(pAngle) * pSpeed * (Math.random() > 0.5 ? 1 : -1),
          vy: Math.sin(pAngle) * pSpeed - Math.random() * 3,
          color: Math.random() > 0.3 ? fruit.innerColor : bladeStyle.particleColor,
          size: Math.random() * 4 + 2,
          life: 0,
          maxLife: 25 + Math.random() * 20,
          shape: 'circle',
        });
      }

      // Combo management
      const now = performance.now();
      if (now - lastSliceTimeRef.current < 450) {
        strokeCutFruitsRef.current.push({ id: fruit.id, time: now });
      } else {
        strokeCutFruitsRef.current = [{ id: fruit.id, time: now }];
      }
      lastSliceTimeRef.current = now;

      // Base points calculation
      const hasDouble = activePowerups.some((p) => p.type === 'double');
      const pointMultiplier = hasDouble ? 2 : 1;
      const earned = fruit.points * pointMultiplier;

      // Score update
      const currentCombo = strokeCutFruitsRef.current.length;
      onScoreUpdate(earned, currentCombo);

      // Floating score number
      floatingTextsRef.current.push({
        id: Math.random().toString(),
        text: `+${earned}`,
        x: fruit.x,
        y: fruit.y - 15,
        vy: -1.8,
        alpha: 1,
        scale: 1.1,
        color: '#ffea00',
      });

      // Combo announcement
      if (currentCombo >= 3) {
        sound.playCombo(currentCombo);
        screenShakeRef.current = 6;
        floatingTextsRef.current.push({
          id: Math.random().toString(),
          text: `${currentCombo}x COMBO! +${currentCombo * pointMultiplier}`,
          x: fruit.x,
          y: fruit.y - 45,
          vy: -2.2,
          alpha: 1,
          scale: 1.4,
          color: '#00e676',
        });
        onScoreUpdate(currentCombo * pointMultiplier, currentCombo);
      }
    },
    [mode, bladeStyle, onFruitSliced, onGameOver, onScoreUpdate, activePowerups, onActivatePowerup]
  );

  // Check blade intersection and direct touch contact with active fruits
  const checkCollisions = useCallback(
    (p1: Point, p2: Point) => {
      const activeFruits = fruitsRef.current.filter((f) => !f.isSliced);
      if (activeFruits.length === 0) return;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      for (const fruit of activeFruits) {
        // Direct contact test at point p2 (current finger / cursor position)
        const dCursor = Math.hypot(p2.x - fruit.x, p2.y - fruit.y);
        if (dCursor <= fruit.radius + 6) {
          // Immediate cut on touch!
          let angle: number;
          if (dist > 1.5) {
            angle = Math.atan2(dy, dx);
          } else {
            const rx = p2.x - fruit.x;
            const ry = p2.y - fruit.y;
            angle = Math.hypot(rx, ry) > 3 ? Math.atan2(ry, rx) + Math.PI / 2 : -Math.PI / 4;
          }
          handleSlice(fruit, angle, { x: p2.x, y: p2.y });
          continue;
        }

        // Line segment swipe intersection test (if moving)
        if (dist >= 1.0) {
          const hit = lineIntersectsCircle(p1, p2, { x: fruit.x, y: fruit.y }, fruit.radius);
          if (hit.intersects) {
            handleSlice(fruit, hit.angle, hit.impactPoint);
          }
        }
      }
    },
    [handleSlice]
  );

  // Add blade point to trail queue
  const addBladePoint = useCallback(
    (x: number, y: number) => {
      const now = performance.now();
      const trail = bladeTrailRef.current;

      if (trail.length > 0) {
        const last = trail[trail.length - 1];
        const dist = distance(last, { x, y });
        checkCollisions(last, { x, y });

        // Blade swish audio on fast motions
        if (dist > 35 && Math.random() < 0.25) {
          sound.playSwish();
        }

        // Prevent zero-distance clumping (< 2px) which creates angular micro-kinks
        if (dist < 2.0) {
          last.timestamp = now;
          return;
        }
      }

      trail.push({ x, y, timestamp: now });

      // Blade spark particles at tip
      if (Math.random() < 0.45) {
        particlesRef.current.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          color: bladeStyle.particleColor,
          size: Math.random() * 2.5 + 1,
          life: 0,
          maxLife: 14,
          shape: 'spark',
        });
      }

      // Retain points for 250ms for a flowing, graceful thread
      while (trail.length > 0 && now - trail[0].timestamp > 250) {
        trail.shift();
      }
    },
    [checkCollisions, bladeStyle]
  );

  // Synchronize hand tracking coordinate to canvas — reads ref directly inside the game loop
  const lastHandPosRef = useRef<{ x: number; y: number } | null>(null);
  const addBladePointRef = useRef(addBladePoint);
  useEffect(() => { addBladePointRef.current = addBladePoint; }, [addBladePoint]);
  const checkCollisionsRef = useRef(checkCollisions);
  useEffect(() => { checkCollisionsRef.current = checkCollisions; }, [checkCollisions]);

  // Mouse & Touch events handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mousePosRef.current = { x, y };
    bladeTrailRef.current = [{ x, y, timestamp: performance.now() }];
    checkCollisions({ x, y }, { x, y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current && e.pointerType === 'mouse' && e.buttons === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mousePosRef.current = { x, y };
    addBladePoint(x, y);
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Game loop
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.1);
      lastFrameTimeRef.current = timestamp;

      // Read and smoothly advance hand position ref every frame — sub-frame continuous interpolation
      const handPos = bladeInputPosRef.current;
      const canvas2 = canvasRef.current;
      if (canvas2 && handPos) {
        const dpr2 = window.devicePixelRatio || 1;
        const targetX = handPos.x * (canvas2.width / dpr2);
        const targetY = handPos.y * (canvas2.height / dpr2);

        if (!lastHandPosRef.current) {
          lastHandPosRef.current = { x: targetX, y: targetY };
          addBladePointRef.current(targetX, targetY);
        } else {
          // 60 FPS sub-frame smooth interpolation towards target
          const dx = targetX - lastHandPosRef.current.x;
          const dy = targetY - lastHandPosRef.current.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 0.4) {
            // Adaptive interpolation step: rapid response with smooth continuous transition
            const step = Math.min(1.0, 0.92);
            const nextX = lastHandPosRef.current.x + dx * step;
            const nextY = lastHandPosRef.current.y + dy * step;
            lastHandPosRef.current = { x: nextX, y: nextY };
            addBladePointRef.current(nextX, nextY);
          } else {
            // Very small or zero motion: keep tip fresh without adding jitter
            if (bladeTrailRef.current.length > 0) {
              bladeTrailRef.current[bladeTrailRef.current.length - 1].timestamp = performance.now();
            }
            if (lastHandPosRef.current) {
              checkCollisionsRef.current(lastHandPosRef.current, { x: targetX, y: targetY });
            }
          }
        }
      } else if (!handPos && lastHandPosRef.current !== null) {
        lastHandPosRef.current = null;
        bladeTrailRef.current = [];
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Check freeze powerup slow-mo factor
      const isFrozen = activePowerups.some((p) => p.type === 'freeze');
      const timeScale = isFrozen ? 0.38 : 1.0;
      const gravity = 0.36 * timeScale;

      // Handle Screen Shake
      ctx.save();
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current *= 0.88;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw Dojo Wood Background
      ctx.fillStyle = '#1c100b';
      ctx.fillRect(0, 0, width, height);

      // Dojo wood planks dividers
      ctx.strokeStyle = '#120906';
      ctx.lineWidth = 3;
      const plankHeight = 90;
      for (let y = 0; y < height; y += plankHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw subtle wood grain vignette
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.2,
        width / 2,
        height / 2,
        width * 0.85
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Freeze Powerup Icy Vignette
      if (isFrozen) {
        const icyVignette = ctx.createRadialGradient(
          width / 2,
          height / 2,
          width * 0.2,
          width / 2,
          height / 2,
          width * 0.85
        );
        icyVignette.addColorStop(0, 'rgba(0, 229, 255, 0)');
        icyVignette.addColorStop(1, 'rgba(0, 229, 255, 0.25)');
        ctx.fillStyle = icyVignette;
        ctx.fillRect(0, 0, width, height);
      }

      // 1. Draw Juice Splatters (fade out over 4 seconds)
      const now2 = performance.now();
      splattersRef.current = splattersRef.current.filter((s) => now2 - s.createdAt < 4000);
      splattersRef.current.forEach((s) => {
        const age = now2 - s.createdAt;
        const fade = Math.max(0, 1 - age / 4000);
        ctx.save();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha * 0.55 * fade;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();

        s.drops.forEach((d) => {
          ctx.beginPath();
          ctx.arc(s.x + d.x, s.y + d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      });

      // 2. Fruit Spawning Logic (when game is playing)
      if (status === 'playing') {
        const isFrenzy = activePowerups.some((p) => p.type === 'frenzy');
        const currentInterval = isFrenzy ? 300 : nextSpawnIntervalRef.current;

        // Optimal on-screen fruit limits: max 3 active unsliced fruits normally, max 6 in frenzy mode
        const maxOnScreenFruits = isFrenzy ? 6 : 3;
        const currentActiveCount = fruitsRef.current.filter((f) => !f.isSliced).length;

        if (timestamp - lastSpawnTimeRef.current > currentInterval && currentActiveCount < maxOnScreenFruits) {
          lastSpawnTimeRef.current = timestamp;
          // Relaxed cadence: 1200ms - 2000ms between tosses
          nextSpawnIntervalRef.current = Math.random() * 800 + 1200;

          // Spawn batch: mostly 1, occasionally 2, never 3 outside frenzy
          const availableSlots = maxOnScreenFruits - currentActiveCount;
          const batchRand = Math.random();
          const desiredBatchSize = isFrenzy
            ? Math.floor(Math.random() * 2) + 2 // 2-3 fruits per toss in frenzy
            : batchRand < 0.25
            ? 2
            : 1;

          const batchSize = Math.min(desiredBatchSize, availableSlots);

          for (let b = 0; b < batchSize; b++) {
            setTimeout(() => {
              if (status === 'playing') {
                const currentCount = fruitsRef.current.filter((f) => !f.isSliced).length;
                if (currentCount < maxOnScreenFruits) {
                  spawnFruit();
                }
              }
            }, b * 130);
          }
        }
      }

      // 3. Update & Draw Active Fruits
      const aliveFruits: Fruit[] = [];
      for (const fruit of fruitsRef.current) {
        if (fruit.isSliced) continue;

        // Apply velocities & gravity
        fruit.x += fruit.vx * timeScale;
        fruit.y += fruit.vy * timeScale;
        fruit.vy += gravity;
        fruit.rotation += fruit.vRot * timeScale;

        // Missed fruit strike check (fell below bottom)
        if (fruit.y > height + 50 && fruit.vy > 0) {
          if (!fruit.isBomb && mode === 'classic' && status === 'playing') {
            sound.playStrike();
            onStrike();
          }
          continue; // Remove fruit
        }

        aliveFruits.push(fruit);

        // Draw Fruit
        drawFruit(ctx, fruit);
      }
      fruitsRef.current = aliveFruits;

      // 4. Update & Draw Sliced Halves
      const aliveHalves: SlicedHalf[] = [];
      for (const half of halvesRef.current) {
        half.x += half.vx * timeScale;
        half.y += half.vy * timeScale;
        half.vy += gravity * 1.05;
        half.rotation += half.vRot * timeScale;
        half.life += dt;

        if (half.y < height + 80 && half.life < 3) {
          aliveHalves.push(half);
          drawSlicedHalf(ctx, half);
        }
      }
      halvesRef.current = aliveHalves;

      // 5. Update & Draw Particles (Sparks & Juice)
      const aliveParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity on juice drops
        p.life++;

        if (p.life < p.maxLife) {
          aliveParticles.push(p);
          const alpha = 1 - p.life / p.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;

          if (p.shape === 'spark') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      particlesRef.current = aliveParticles;

      // 6. Draw Glowing Sword Trail
      drawBladeTrail(ctx, bladeTrailRef.current, bladeStyle);

      // Clean old blade points (250ms graceful thread duration)
      const now = performance.now();
      while (bladeTrailRef.current.length > 0 && now - bladeTrailRef.current[0].timestamp > 250) {
        bladeTrailRef.current.shift();
      }

      // 7. Update & Draw Floating Texts (+1, COMBO x3)
      const aliveTexts: FloatingText[] = [];
      for (const ft of floatingTextsRef.current) {
        ft.y += ft.vy;
        ft.alpha -= 0.025;
        ft.scale = Math.max(0.9, ft.scale - 0.008);

        if (ft.alpha > 0) {
          aliveTexts.push(ft);
          ctx.save();
          ctx.globalAlpha = ft.alpha;
          ctx.fillStyle = ft.color;
          ctx.font = `bold ${Math.round(22 * ft.scale)}px 'Permanent Marker', cursive`;
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 8;
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }
      }
      floatingTextsRef.current = aliveTexts;

      ctx.restore(); // Restore from screen shake

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, mode, bladeStyle, activePowerups, onStrike, spawnFruit]);

  return (
    <div className="relative w-full h-full select-none touch-none overflow-hidden cursor-crosshair">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
};

/**
 * High-fidelity Vector Rendering for Whole Fruits
 */
function drawFruit(ctx: CanvasRenderingContext2D, fruit: Fruit) {
  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.rotation);

  const r = fruit.radius;

  if (fruit.isBomb) {
    // Bomb drawing
    // Main iron sphere
    const bombGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    bombGrad.addColorStop(0, '#555555');
    bombGrad.addColorStop(0.5, '#222222');
    bombGrad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = bombGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Metallic cap
    ctx.fillStyle = '#78909c';
    ctx.fillRect(-6, -r - 5, 12, 6);

    // Fuse
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r - 4);
    ctx.quadraticCurveTo(8, -r - 14, 12, -r - 20);
    ctx.stroke();

    // Spark flame
    ctx.fillStyle = Math.random() > 0.5 ? '#ffeb3b' : '#ff3d00';
    ctx.beginPath();
    ctx.arc(12, -r - 20, Math.random() * 4 + 3, 0, Math.PI * 2);
    ctx.fill();

    // Skull / Warning symbol
    ctx.fillStyle = '#ff1744';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☠', 0, 1);
  } else if (fruit.type === 'watermelon') {
    // Watermelon
    ctx.fillStyle = fruit.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Dark stripes
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 4;
    for (let s = -r + 8; s <= r - 8; s += 16) {
      ctx.beginPath();
      ctx.arc(s, 0, Math.sqrt(Math.max(0, r * r - s * s)), -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  } else if (fruit.type === 'orange') {
    // Orange
    const orangeGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
    orangeGrad.addColorStop(0, '#ffa726');
    orangeGrad.addColorStop(1, '#e65100');
    ctx.fillStyle = orangeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Small stem
    ctx.fillStyle = '#33691e';
    ctx.beginPath();
    ctx.arc(0, -r + 2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (fruit.type === 'apple') {
    // Apple
    const appleGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    appleGrad.addColorStop(0, '#ef5350');
    appleGrad.addColorStop(1, '#b71c1c');
    ctx.fillStyle = appleGrad;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Stem and green leaf
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(4, -r - 8, 2, -r - 12);
    ctx.stroke();

    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(6, -r - 6, 6, 3, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (fruit.type.includes('banana')) {
    // Banana shape
    ctx.fillStyle = fruit.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tips
    ctx.fillStyle = '#33691e';
    ctx.beginPath();
    ctx.arc(r * 1.05, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Glow if special
    if (fruit.isSpecial) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else if (fruit.type === 'strawberry') {
    // Strawberry
    ctx.fillStyle = '#d81b60';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Golden seeds
    ctx.fillStyle = '#ffeb3b';
    for (let i = -r + 8; i < r - 8; i += 12) {
      for (let j = -r + 8; j < r - 8; j += 12) {
        if (i * i + j * j < (r - 6) * (r - 6)) {
          ctx.fillRect(i, j, 2, 3);
        }
      }
    }

    // Leaf cap
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.moveTo(-12, -r);
    ctx.lineTo(0, -r - 8);
    ctx.lineTo(12, -r);
    ctx.fill();
  } else if (fruit.type === 'pineapple') {
    // Pineapple
    ctx.fillStyle = '#e65100';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Diamond grid
    ctx.strokeStyle = '#f57f17';
    ctx.lineWidth = 2;
    for (let a = -r; a <= r; a += 14) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, a);
      ctx.lineTo(r * 0.7, a + 14);
      ctx.stroke();
    }

    // Crown leaves
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.moveTo(-15, -r);
    ctx.lineTo(-20, -r - 18);
    ctx.lineTo(0, -r - 10);
    ctx.lineTo(20, -r - 18);
    ctx.lineTo(15, -r);
    ctx.fill();
  } else {
    // Default / Coconut
    ctx.fillStyle = fruit.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Specular shine highlight on fruits
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders sliced fruit half with scrambled / jagged cut face passing through the contact point,
 * rich pulp, seeds, rind, and juicy highlight.
 */
function drawSlicedHalf(ctx: CanvasRenderingContext2D, half: SlicedHalf) {
  ctx.save();
  ctx.translate(half.x, half.y);
  ctx.rotate(half.sliceAngle + half.rotation);

  const r = half.radius;
  const pts = half.scrambledPoints;
  const offset = half.cutOffset ?? 0;

  if (pts && pts.length >= 2) {
    const halfChord = Math.sqrt(Math.max(1, r * r - offset * offset));
    const phiTop = Math.atan2(-halfChord, offset);
    const phiBot = Math.atan2(halfChord, offset);

    // Build the outer silhouette of this scrambled half
    ctx.beginPath();
    if (half.isLeftHalf) {
      // Outer circular arc on the left side: from phiBot clockwise through PI to phiTop
      ctx.arc(0, 0, r, phiBot, phiTop, false);
      // Scrambled cut edge from top to bottom
      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    } else {
      // Outer circular arc on the right side: from phiTop clockwise through 0 to phiBot
      ctx.arc(0, 0, r, phiTop, phiBot, false);
      // Scrambled cut edge from bottom back to top
      for (let i = pts.length - 1; i >= 0; i--) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    }
    ctx.closePath();

    // 1. Fill Rind / Skin
    ctx.fillStyle = half.color;
    ctx.fill();

    // 2. Draw Pulp Layer (clipped to half silhouette)
    ctx.save();
    ctx.clip();

    ctx.fillStyle = half.innerColor;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
    ctx.fill();

    // Fruit specific pulp texture & seeds
    if (half.type === 'watermelon') {
      // Watermelon black seeds along the scrambled cut
      ctx.fillStyle = '#1e1e1e';
      const seedCount = 6;
      for (let i = 0; i < seedCount; i++) {
        const seedT = (i + 1) / (seedCount + 1);
        const sy = -halfChord * 0.75 + seedT * (halfChord * 1.5);
        const sx = half.isLeftHalf ? offset - 10 - (i % 2) * 5 : offset + 10 + (i % 2) * 5;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 3, 2, Math.PI / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (half.type === 'orange') {
      // Orange radial segment dividers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82);
        ctx.stroke();
      }
    } else if (half.type === 'apple') {
      // Apple core and seeds
      ctx.fillStyle = '#3e2723';
      const seedX = half.isLeftHalf ? offset - 6 : offset + 6;
      ctx.beginPath();
      ctx.ellipse(seedX, -5, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(seedX, 5, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (half.type.includes('banana')) {
      // Banana center core dots
      ctx.fillStyle = '#8d6e63';
      for (let d = -r * 0.4; d <= r * 0.4; d += 8) {
        ctx.beginPath();
        ctx.arc(offset + (half.isLeftHalf ? -3 : 3), d, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (half.type === 'strawberry') {
      // Strawberry radiating streaks
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2;
      for (let a = -Math.PI / 2; a <= Math.PI / 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
        ctx.stroke();
      }
    } else if (half.type === 'pineapple') {
      // Pineapple fibrous rings
      ctx.strokeStyle = 'rgba(245, 127, 23, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore(); // end clip

    // 3. Highlight the Scrambled Cut Face Edge
    ctx.beginPath();
    if (half.isLeftHalf) {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    } else {
      ctx.moveTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      for (let i = pts.length - 2; i >= 0; i--) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    }
    // Juicy glistening edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'bevel';
    ctx.stroke();

    // Inner fruit color glow along the scrambled cut
    ctx.strokeStyle = half.innerColor;
    ctx.lineWidth = 1.0;
    ctx.stroke();
  } else {
    // Fallback semi-circle path
    ctx.beginPath();
    if (half.isLeftHalf) {
      ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, true);
    } else {
      ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    }
    ctx.closePath();

    ctx.fillStyle = half.color;
    ctx.fill();

    ctx.beginPath();
    if (half.isLeftHalf) {
      ctx.arc(0, 0, r * 0.85, -Math.PI / 2, Math.PI / 2, true);
    } else {
      ctx.arc(0, 0, r * 0.85, -Math.PI / 2, Math.PI / 2, false);
    }
    ctx.closePath();
    ctx.fillStyle = half.innerColor;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders an ultra-smooth, curving thread that flows without angular bends
 */
function drawBladeTrail(ctx: CanvasRenderingContext2D, trail: BladePoint[], style: BladeStyle) {
  if (trail.length < 2) return;

  const now = performance.now();
  const tipAge = now - trail[trail.length - 1].timestamp;
  const baseAlpha = Math.max(0, 1 - tipAge / 250);
  if (baseAlpha <= 0.02) return;

  // 1. Thread Bending Stiffness Relaxation (Laplacian smoothing)
  // Removes any residual sharp kinks from hand detection noise
  const relaxed = relaxTrailPoints(trail, 0.36, 2);

  // 2. Continuous Centripetal Catmull-Rom Spline Curve (dense smooth points)
  const thread = generateCurvingThread(relaxed, 8);
  const N = thread.length;
  if (N < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Pass 1: Outer glowing aura (tapering from 15px down to fine thread) ---
  ctx.strokeStyle = style.glowColor;
  for (let i = 0; i < N - 1; i++) {
    const t = (i + 1) / N; // 0 (tail) -> 1 (head)
    const progress = Math.pow(t, 0.85);
    ctx.lineWidth = Math.max(1, 15 * progress);
    ctx.globalAlpha = baseAlpha * (0.08 + 0.32 * progress);

    ctx.beginPath();
    ctx.moveTo(thread[i].x, thread[i].y);
    ctx.lineTo(thread[i + 1].x, thread[i + 1].y);
    ctx.stroke();
  }

  // --- Pass 2: Saturated thread body (tapering from 5.5px down to 0.75px) ---
  ctx.strokeStyle = style.primaryColor;
  for (let i = 0; i < N - 1; i++) {
    const t = (i + 1) / N;
    const progress = Math.pow(t, 0.9);
    ctx.lineWidth = Math.max(0.75, 5.5 * progress);
    ctx.globalAlpha = baseAlpha * (0.18 + 0.75 * progress);

    ctx.beginPath();
    ctx.moveTo(thread[i].x, thread[i].y);
    ctx.lineTo(thread[i + 1].x, thread[i + 1].y);
    ctx.stroke();
  }

  // --- Pass 3: Radiant incandescent inner core (tapering from 2px down to 0.4px) ---
  ctx.strokeStyle = style.coreColor;
  for (let i = 0; i < N - 1; i++) {
    const t = (i + 1) / N;
    const progress = Math.pow(t, 1.05);
    ctx.lineWidth = Math.max(0.4, 2.0 * progress);
    ctx.globalAlpha = baseAlpha * (0.30 + 0.70 * progress);

    ctx.beginPath();
    ctx.moveTo(thread[i].x, thread[i].y);
    ctx.lineTo(thread[i + 1].x, thread[i + 1].y);
    ctx.stroke();
  }

  // --- Pass 4: Glowing guide bead at the leading tip (hand/finger) ---
  const tip = thread[N - 1];
  ctx.globalAlpha = baseAlpha * 0.95;
  ctx.fillStyle = style.coreColor;
  ctx.shadowColor = style.glowColor;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
