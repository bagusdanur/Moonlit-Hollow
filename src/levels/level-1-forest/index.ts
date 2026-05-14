import type { LevelConfig } from '../types';
import { LEVEL_1_ENEMIES } from './enemies';
import { LEVEL_1_WAVES } from './waves';

export const LEVEL_1_FOREST = {
  id: 'level-1-forest',
  title: 'Level 1 Forest',
  shortTitle: 'L1 Forest',
  backgroundKey: 'level-1-forest-bg',
  backgroundPath: '/assets/bg/level-1/bg-forest.png',
  enemyStats: LEVEL_1_ENEMIES,
  waveNames: ['Snail', 'Small Bee', 'Boar', 'Alpha Boar'],
  waves: LEVEL_1_WAVES,
} satisfies LevelConfig;
