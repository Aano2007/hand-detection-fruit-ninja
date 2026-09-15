export type GameMode = 'classic' | 'arcade' | 'zen';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

export type FruitType =
  | 'watermelon'
  | 'orange'
  | 'banana'
  | 'apple'
  | 'strawberry'
  | 'pineapple'
  | 'coconut'
  | 'bomb'
  | 'freeze_banana'
  | 'frenzy_banana'
  | 'double_banana';

export interface FruitConfig {
  type: FruitType;
  name: string;
  radius: number;
  points: number;
  color: string;
  innerColor: string;
  rindColor?: string;
  isBomb: boolean;
  isSpecial?: boolean;
  specialType?: 'freeze' | 'frenzy' | 'double';
}

export interface Fruit {
  id: string;
  type: FruitType;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  isSliced: boolean;
  isBomb: boolean;
  isSpecial?: boolean;
  specialType?: 'freeze' | 'frenzy' | 'double';
  points: number;
  color: string;
  innerColor: string;
  rindColor?: string;
  sliceAngle?: number;
}

export interface SlicedHalf {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  sliceAngle: number;
  isLeftHalf: boolean;
  radius: number;
  color: string;
  innerColor: string;
  rindColor?: string;
  life: number;
  cutOffset?: number;
  scrambledPoints?: { x: number; y: number }[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape?: 'spark' | 'circle' | 'drop';
}

export interface JuiceSplatter {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  drops: { x: number; y: number; r: number }[];
  createdAt: number;
}

export interface BladePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface BladeStyle {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  glowColor: string;
  coreColor: string;
  particleColor: string;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  scale: number;
  color: string;
}

export interface VisionStats {
  fps: number;
  isTracking: boolean;
  handDetected: boolean;
  landmarkCount: number;
  indexFinger: { x: number; y: number; z: number } | null;
  thumbFinger: { x: number; y: number; z: number } | null;
  pinchDistance: number;
  isPinching: boolean;
  detectionConfidence: number;
  cameraActive: boolean;
  cameraError: string | null;
  inputMode: 'hand' | 'mouse';
}

export interface ComboEvent {
  count: number;
  scoreBonus: number;
  text: string;
  timestamp: number;
}

export interface ActivePowerup {
  type: 'freeze' | 'frenzy' | 'double';
  timeLeft: number;
  maxDuration: number;
}
