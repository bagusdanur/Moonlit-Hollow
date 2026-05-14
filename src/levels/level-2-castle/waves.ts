import type { EnemySpawn } from '../../game/enemies/types';

export const LEVEL_2_WAVES = [
  [
    { kind: 'bat', x: 980, hp: 3, score: 150 },
    { kind: 'bat', x: 1340, hp: 3, score: 150 },
    { kind: 'bat', x: 1760, hp: 4, score: 175 },
    { kind: 'bat', x: 2100, hp: 3, score: 150 },
    { kind: 'bat', x: 2440, hp: 4, score: 175 },
  ],
  [
    { kind: 'skeleton', x: 760, hp: 3, score: 125 },
    { kind: 'skeleton', x: 1220, hp: 3, score: 125 },
    { kind: 'skeleton', x: 1540, hp: 4, score: 150 },
    { kind: 'skeleton', x: 1960, hp: 3, score: 125 },
    { kind: 'skeleton', x: 2320, hp: 4, score: 150 },
  ],
  [
    { kind: 'bat', x: 1360, hp: 4, score: 175 },
    { kind: 'skeleton', x: 920, hp: 4, score: 160 },
    { kind: 'skeleton', x: 1880, hp: 5, score: 200 },
    { kind: 'bat', x: 2260, hp: 4, score: 175 },
    { kind: 'skeleton', x: 2560, hp: 4, score: 160 },
    { kind: 'bat', x: 2920, hp: 4, score: 175 },
  ],
  [
    { kind: 'deathBringer', x: 760, hp: 28, score: 1400 },
  ],
] satisfies EnemySpawn[][];
