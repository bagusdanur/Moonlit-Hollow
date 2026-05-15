import Phaser from 'phaser';
import { GROUND_Y, WORLD_LEFT, WORLD_RIGHT } from '../config';
import type { PlayerController } from '../PlayerController';
import type { EnemyStats } from './types';
import type { RuntimeEnemy } from './runtimeTypes';

type BossSpellOptions = {
  scene: Phaser.Scene;
  enemy: RuntimeEnemy;
  stats: EnemyStats;
  player: PlayerController;
  time: number;
  playEnemy: (enemy: RuntimeEnemy, key: string) => void;
  clearTint: (enemy: RuntimeEnemy) => void;
  onPlayerHit: (direction: 1 | -1, time: number, damage: number) => void;
};

export function tryBossSpecial(options: BossSpellOptions) {
  const { scene, enemy, stats, player, time, playEnemy, clearTint, onPlayerHit } = options;
  const distance = Math.abs(player.body.x - enemy.sprite.x);
  const castRange = 280;

  if (!enemy.isBoss || !stats.specialAnim || time < enemy.nextSpecialAt || distance > castRange) {
    return false;
  }

  enemy.nextSpecialAt = time + 3300;
  enemy.specialCastingUntil = time + 780;
  enemy.stunnedUntil = Math.max(enemy.stunnedUntil, time + 780);
  playEnemy(enemy, stats.castAnim ?? stats.idleAnim);
  enemy.sprite.setTint(0xd7b4ff);
  scene.time.delayedCall(520, () => castBossSpell(scene, enemy, stats.specialAnim!, player, onPlayerHit));
  scene.time.delayedCall(780, () => clearTint(enemy));

  return true;
}

function castBossSpell(
  scene: Phaser.Scene,
  enemy: RuntimeEnemy,
  specialAnim: string,
  player: PlayerController,
  onPlayerHit: (direction: 1 | -1, time: number, damage: number) => void,
) {
  if (!enemy.alive) {
    return;
  }

  const playerBody = player.body.body as Phaser.Physics.Arcade.Body;
  const predictedX = player.body.x + playerBody.velocity.x * 0.3;
  const targetX = Phaser.Math.Clamp(predictedX, WORLD_LEFT + 70, WORLD_RIGHT - 70);
  const targetY = GROUND_Y + 2;
  const warning = scene.add.circle(targetX, targetY - 8, 58, 0x8e38ff, 0.24).setDepth(7);
  const ring = scene.add.circle(targetX, targetY - 8, 58).setStrokeStyle(4, 0xf0d8ff, 0.76).setDepth(8);

  scene.tweens.add({
    targets: [warning, ring],
    scale: 1.18,
    alpha: 0.1,
    duration: 380,
    yoyo: true,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      warning.destroy();
      ring.destroy();
      resolveBossSpell(scene, targetX, targetY, specialAnim, player, onPlayerHit);
    },
  });
}

function resolveBossSpell(
  scene: Phaser.Scene,
  x: number,
  y: number,
  specialAnim: string,
  player: PlayerController,
  onPlayerHit: (direction: 1 | -1, time: number, damage: number) => void,
) {
  const spell = scene.add.sprite(x, y, `${specialAnim}-1`).setOrigin(0.5, 1).setScale(3.5).setDepth(12).play(specialAnim);

  scene.cameras.main.shake(110, 0.0022);
  scene.time.delayedCall(45, () => {
    const closeEnough = Math.abs(player.body.x - x) <= 78;
    const sameLevel = Math.abs(player.body.y - y) <= 116;

    if (closeEnough && sameLevel) {
      const direction: 1 | -1 = player.body.x < x ? -1 : 1;
      onPlayerHit(direction, scene.time.now, 2.5);
    }
  });
  spell.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spell.destroy());
}
