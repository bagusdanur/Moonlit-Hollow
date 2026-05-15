import Phaser from 'phaser';
import { GROUND_Y, WORLD_LEFT, WORLD_RIGHT } from '../config';
import type { EnemyKind, EnemyStats } from './types';
import type { RuntimeEnemy } from './runtimeTypes';

export function createSpawnWarning(scene: Phaser.Scene, spawnX: number, kind: EnemyKind, stats: EnemyStats) {
  const x = Phaser.Math.Clamp(spawnX, WORLD_LEFT + 52, WORLD_RIGHT - 52);
  const y = GROUND_Y + stats.yOffset - 20;
  const color = kind === 'bat' ? 0x9fe8ff : 0xf5d77d;
  const glow = scene.add.circle(x, y, 26, color, 0.14).setDepth(7);
  const ring = scene.add.circle(x, y, 26).setStrokeStyle(3, color, 0.72).setDepth(8);
  const mark = scene.add
    .text(x, y - 2, '!', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#05080a',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(9);

  scene.tweens.add({
    targets: [glow, ring, mark],
    scale: 1.28,
    alpha: 0.2,
    duration: 500,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      glow.destroy();
      ring.destroy();
      mark.destroy();
    },
  });
}

export function createSpawnBurst(scene: Phaser.Scene, enemy: RuntimeEnemy) {
  if (enemy.kind !== 'alphaBoar' && enemy.kind !== 'deathBringer') {
    return;
  }

  const color = enemy.kind === 'deathBringer' ? 0x8d5cff : 0xff3855;
  const ring = scene.add.circle(enemy.sprite.x, enemy.sprite.y - 28, 18, color, 0.18).setDepth(8);

  scene.tweens.add({
    targets: ring,
    scale: 3.2,
    alpha: 0,
    duration: 520,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });
}

export function createHitSpark(scene: Phaser.Scene, x: number, y: number, direction: 1 | -1) {
  for (let i = 0; i < 5; i += 1) {
    const spark = scene.add.rectangle(x, y, 3, 3, 0xfff1a3, 1).setDepth(30).setRotation(Phaser.Math.FloatBetween(-0.7, 0.7));

    scene.tweens.add({
      targets: spark,
      x: x + direction * Phaser.Math.Between(16, 34),
      y: y + Phaser.Math.Between(-18, 10),
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => spark.destroy(),
    });
  }
}

export function createHitImpact(scene: Phaser.Scene, x: number, y: number, strong: boolean) {
  const color = strong ? 0xd7b4ff : 0xbff4ff;
  const ring = scene.add.circle(x, y, strong ? 20 : 14).setStrokeStyle(3, color, 0.72).setDepth(31);
  const flash = scene.add.circle(x, y, strong ? 16 : 10, 0xffffff, strong ? 0.32 : 0.24).setDepth(30);

  scene.tweens.add({
    targets: [ring, flash],
    scale: strong ? 2.5 : 2,
    alpha: 0,
    duration: strong ? 240 : 180,
    ease: 'Quad.easeOut',
    onComplete: () => {
      ring.destroy();
      flash.destroy();
    },
  });
}

export function createDefeatBurst(scene: Phaser.Scene, x: number, y: number, strong: boolean) {
  const color = strong ? 0xb743ff : 0xf5d77d;
  const ring = scene.add.circle(x, y, strong ? 28 : 20).setStrokeStyle(4, color, 0.78).setDepth(32);
  const text = scene.add
    .text(x, y - 10, strong ? 'BOSS DOWN' : 'KO', {
      fontFamily: 'monospace',
      fontSize: strong ? '18px' : '16px',
      color: '#eef8ff',
      stroke: '#05080a',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(33);

  scene.tweens.add({
    targets: ring,
    scale: strong ? 3 : 2.2,
    alpha: 0,
    duration: strong ? 520 : 320,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });
  scene.tweens.add({
    targets: text,
    y: y - 42,
    alpha: 0,
    duration: 520,
    ease: 'Quad.easeOut',
    onComplete: () => text.destroy(),
  });
}
