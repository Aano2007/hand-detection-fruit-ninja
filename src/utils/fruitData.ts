import { FruitConfig, BladeStyle } from '../types';

export const FRUIT_CONFIGS: Record<string, FruitConfig> = {
  watermelon: {
    type: 'watermelon',
    name: 'Watermelon',
    radius: 46,
    points: 1,
    color: '#2e7d32', // dark green rind
    innerColor: '#e53935', // bright red pulp
    rindColor: '#c8e6c9', // light green inner rim
    isBomb: false,
  },
  orange: {
    type: 'orange',
    name: 'Orange',
    radius: 36,
    points: 1,
    color: '#fb8c00', // vibrant orange
    innerColor: '#ffa726', // citrus segment color
    rindColor: '#ffe0b2',
    isBomb: false,
  },
  banana: {
    type: 'banana',
    name: 'Banana',
    radius: 38,
    points: 1,
    color: '#fbc02d', // yellow
    innerColor: '#fff9c4', // banana pulp
    rindColor: '#f57f17',
    isBomb: false,
  },
  apple: {
    type: 'apple',
    name: 'Apple',
    radius: 35,
    points: 1,
    color: '#d32f2f', // red apple
    innerColor: '#fffde7', // cream flesh
    rindColor: '#ffcdd2',
    isBomb: false,
  },
  strawberry: {
    type: 'strawberry',
    name: 'Strawberry',
    radius: 30,
    points: 2,
    color: '#e91e63', // bright berry red
    innerColor: '#f48fb1',
    rindColor: '#4caf50', // green stem
    isBomb: false,
  },
  pineapple: {
    type: 'pineapple',
    name: 'Pineapple',
    radius: 44,
    points: 3,
    color: '#f57f17', // golden brown
    innerColor: '#ffee58', // golden yellow pulp
    rindColor: '#2e7d32',
    isBomb: false,
  },
  coconut: {
    type: 'coconut',
    name: 'Coconut',
    radius: 40,
    points: 2,
    color: '#5d4037', // brown shell
    innerColor: '#ffffff', // pure white coconut flesh
    rindColor: '#8d6e63',
    isBomb: false,
  },
  bomb: {
    type: 'bomb',
    name: 'Bomb',
    radius: 34,
    points: 0,
    color: '#212121', // dark charcoal iron
    innerColor: '#ff1744',
    rindColor: '#ffd600',
    isBomb: true,
  },
  freeze_banana: {
    type: 'freeze_banana',
    name: 'Freeze Banana',
    radius: 38,
    points: 2,
    color: '#00bcd4', // ice cyan
    innerColor: '#e0f7fa',
    rindColor: '#80deea',
    isBomb: false,
    isSpecial: true,
    specialType: 'freeze',
  },
  frenzy_banana: {
    type: 'frenzy_banana',
    name: 'Frenzy Banana',
    radius: 38,
    points: 2,
    color: '#ab47bc', // purple frenzy
    innerColor: '#f3e5f5',
    rindColor: '#ce93d8',
    isBomb: false,
    isSpecial: true,
    specialType: 'frenzy',
  },
  double_banana: {
    type: 'double_banana',
    name: 'Double Points Banana',
    radius: 38,
    points: 2,
    color: '#ffd700', // shimmering gold
    innerColor: '#fffde7',
    rindColor: '#ffe082',
    isBomb: false,
    isSpecial: true,
    specialType: 'double',
  },
};

export const BLADE_STYLES: BladeStyle[] = [
  {
    id: 'katana',
    name: 'Shadow Katana',
    description: 'Classic tempered steel with a razor cyan gleam',
    primaryColor: 'rgba(56, 189, 248, 0.9)',
    glowColor: 'rgba(14, 165, 233, 0.6)',
    coreColor: '#ffffff',
    particleColor: '#38bdf8',
  },
  {
    id: 'flame',
    name: 'Dragon Fire',
    description: 'Blazing blade forged from volcanic inferno embers',
    primaryColor: 'rgba(249, 115, 22, 0.95)',
    glowColor: 'rgba(239, 68, 68, 0.65)',
    coreColor: '#fef08a',
    particleColor: '#fb923c',
  },
  {
    id: 'cyber',
    name: 'Plasma Cyber',
    description: 'High-frequency neon energy trail for tech exhibits',
    primaryColor: 'rgba(52, 211, 153, 0.95)',
    glowColor: 'rgba(16, 185, 129, 0.65)',
    coreColor: '#a7f3d0',
    particleColor: '#34d399',
  },
  {
    id: 'sakura',
    name: 'Sakura Petal',
    description: 'Graceful floral slice with cherry blossom sparks',
    primaryColor: 'rgba(244, 114, 182, 0.95)',
    glowColor: 'rgba(219, 39, 119, 0.65)',
    coreColor: '#fdf2f8',
    particleColor: '#f472b6',
  },
  {
    id: 'gold',
    name: 'Golden Solar',
    description: 'Imperial master blade radiating pure sunlight',
    primaryColor: 'rgba(234, 179, 8, 0.95)',
    glowColor: 'rgba(202, 138, 4, 0.65)',
    coreColor: '#fef9c3',
    particleColor: '#facc15',
  },
];
