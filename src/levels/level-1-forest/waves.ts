import type { EnemySpawn } from '../../game/enemies/types';

export const LEVEL_1_WAVES = [
  [
    { kind: 'snail', x: 760, hp: 2, score: 75 },
    { kind: 'snail', x: 1220, hp: 2, score: 75 },
  ],
  [
    { kind: 'bee', x: 1520, hp: 3, score: 125 },
    { kind: 'bee', x: 2040, hp: 3, score: 125 },
  ],
  [
    { kind: 'boar', x: 1760, hp: 5, score: 250 },
    { kind: 'boar', x: 2320, hp: 5, score: 250 },
  ],
  [
    { kind: 'alphaBoar', x: 2320, hp: 12, score: 700 },
  ],
] satisfies EnemySpawn[][];
