import type { EnemySpawn, EnemyStatsMap } from '../game/enemies/types';

export type LevelConfig = {
  id: string;
  title: string;
  shortTitle: string;
  backgroundKey: string;
  backgroundPath: string;
  enemyStats: EnemyStatsMap;
  waveNames: string[];
  waves: EnemySpawn[][];
};
