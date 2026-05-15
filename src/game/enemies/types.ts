export type EnemyKind = 'snail' | 'bee' | 'boar' | 'alphaBoar' | 'skeleton' | 'bat' | 'deathBringer';

export type EnemySpawn = {
  x: number;
  hp: number;
  score: number;
  kind: EnemyKind;
};

export type EnemyStats = {
  speed: number;
  scale: number;
  yOffset: number;
  attackRange: number;
  attackHeight?: number;
  idleAnim: string;
  runAnim: string;
  attackAnim: string;
  castAnim?: string;
  specialAnim?: string;
  hurtAnim?: string;
  deathAnim?: string;
  attackDuration: number;
  attackHitDelay?: number;
  damage?: number;
  facesLeftByDefault: boolean;
  hpBarOffsetY: number;
  spawnGrace: number;
};

export type EnemyStatsMap = Partial<Record<EnemyKind, EnemyStats>>;
