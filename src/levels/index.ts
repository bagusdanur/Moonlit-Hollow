import type { LevelConfig } from './types';
import { LEVEL_1_FOREST } from './level-1-forest';
import { LEVEL_2_CASTLE } from './level-2-castle';

export const LEVELS = [LEVEL_1_FOREST, LEVEL_2_CASTLE] satisfies LevelConfig[];

export function getLevelById(levelId?: string) {
  return LEVELS.find((level) => level.id === levelId) ?? LEVEL_1_FOREST;
}
