import Phaser from 'phaser';
import { WORLD_LEFT, WORLD_RIGHT } from './config';
import type { EnemyStats } from './enemies/types';

export type BoarChargeState = 'ready' | 'telegraph' | 'charge';

export type BoarRuntime = {
  kind: string;
  sprite: Phaser.GameObjects.Sprite;
  chargeState: BoarChargeState;
  chargeDirection: 1 | -1;
  chargeUntil: number;
  nextChargeAt: number;
};

type BoarChargeResult = {
  handled: boolean;
  direction?: 1 | -1;
  animation?: string;
  sound?: 'boar-dash';
};

const BOAR_CHARGE_MIN_DISTANCE = 150;
const BOAR_CHARGE_MAX_DISTANCE = 520;

const CHARGE_PROFILE = {
  boar: {
    telegraph: 480,
    duration: 520,
    cooldown: 1700,
    speed: 360,
  },
  alphaBoar: {
    telegraph: 360,
    duration: 620,
    cooldown: 1050,
    speed: 440,
  },
} as const;

export function updateBoarCharge(
  enemy: BoarRuntime,
  time: number,
  dt: number,
  playerX: number,
  canAct: boolean,
  stats: EnemyStats,
): BoarChargeResult {
  if (enemy.kind !== 'boar' && enemy.kind !== 'alphaBoar') {
    return { handled: false };
  }

  const profile = enemy.kind === 'alphaBoar' ? CHARGE_PROFILE.alphaBoar : CHARGE_PROFILE.boar;
  const dx = playerX - enemy.sprite.x;
  const absDx = Math.abs(dx);
  const direction: 1 | -1 = dx > 0 ? 1 : -1;
  const isInsideMap = enemy.sprite.x >= WORLD_LEFT && enemy.sprite.x <= WORLD_RIGHT;

  if (enemy.chargeState === 'telegraph') {
    if (time >= enemy.chargeUntil) {
      enemy.chargeState = 'charge';
      enemy.chargeUntil = time + profile.duration;
      enemy.sprite.clearTint();
      enemy.sprite.x = Phaser.Math.Clamp(
        enemy.sprite.x + enemy.chargeDirection * profile.speed * dt,
        WORLD_LEFT,
        WORLD_RIGHT,
      );
      return {
        handled: true,
        direction: enemy.chargeDirection,
        animation: stats.runAnim,
        sound: 'boar-dash',
      };
    } else {
      enemy.sprite.setTint(enemy.kind === 'alphaBoar' ? 0xff3855 : 0xff6b3a);
      return {
        handled: true,
        direction: enemy.chargeDirection,
        animation: stats.idleAnim,
      };
    }
  }

  if (enemy.chargeState === 'charge') {
    if (time >= enemy.chargeUntil) {
      enemy.chargeState = 'ready';
      enemy.nextChargeAt = time + profile.cooldown;
      enemy.sprite.clearTint();
    } else {
      enemy.sprite.x = Phaser.Math.Clamp(
        enemy.sprite.x + enemy.chargeDirection * profile.speed * dt,
        WORLD_LEFT,
        WORLD_RIGHT,
      );
      return {
        handled: true,
        direction: enemy.chargeDirection,
        animation: stats.runAnim,
      };
    }
  }

  if (
    canAct &&
    isInsideMap &&
    time >= enemy.nextChargeAt &&
    absDx >= BOAR_CHARGE_MIN_DISTANCE &&
    absDx <= BOAR_CHARGE_MAX_DISTANCE
  ) {
    enemy.chargeState = 'telegraph';
    enemy.chargeDirection = direction;
    enemy.chargeUntil = time + profile.telegraph;
    return {
      handled: true,
      direction,
      animation: stats.idleAnim,
    };
  }

  return { handled: false };
}
