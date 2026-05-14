import type { LevelConfig } from '../types';
import { LEVEL_2_ENEMIES } from './enemies';
import { LEVEL_2_WAVES } from './waves';

export const LEVEL_2_CASTLE = {
  id: 'level-2-castle',
  title: 'Level 2 Castle',
  shortTitle: 'L2 Castle',
  backgroundKey: 'level-2-castle-bg',
  backgroundPath: '/assets/bg/level-2/bg-castle.png',
  enemyStats: LEVEL_2_ENEMIES,
  waveNames: ['Night Bats', 'Skeleton Guard', 'Bone and Wing', 'Bringer of Death'],
  waves: LEVEL_2_WAVES,
} satisfies LevelConfig;
