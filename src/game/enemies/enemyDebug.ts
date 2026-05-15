import Phaser from 'phaser';
import type { EnemyStats } from './types';
import type { RuntimeEnemy } from './runtimeTypes';

export class EnemyDebugView {
  private scene: Phaser.Scene;
  private graphics?: Phaser.GameObjects.Graphics;
  private enabled = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (!enabled) {
      this.graphics?.clear();
    }
  }

  draw(enemies: RuntimeEnemy[], getStats: (enemy: RuntimeEnemy) => EnemyStats) {
    if (!this.enabled) {
      return;
    }

    if (!this.graphics) {
      this.graphics = this.scene.add.graphics().setDepth(95);
    }

    this.graphics.clear();
    enemies.forEach((enemy) => {
      if (!enemy.alive) {
        return;
      }

      const stats = getStats(enemy);
      const height = stats.attackHeight ?? 92;

      this.graphics!.lineStyle(2, 0xff5f7f, 0.74);
      this.graphics!.strokeRect(enemy.sprite.x - stats.attackRange, enemy.sprite.y - height, stats.attackRange * 2, height);
    });
  }

  destroy() {
    this.graphics?.destroy();
    this.graphics = undefined;
  }
}
