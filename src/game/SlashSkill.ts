import Phaser from 'phaser';
import {
  SLASH_COOLDOWN,
  SLASH_DAMAGE,
  SLASH_RANGE,
  SLASH_SPEED,
  WORLD_LEFT,
  WORLD_WIDTH,
} from './config';
import type { EnemyWaveManager } from './EnemyWaveManager';
import type { PlayerController } from './PlayerController';

type SlashProjectile = {
  container: Phaser.GameObjects.Container;
  startX: number;
  direction: 1 | -1;
  hitId: number;
  trailElapsed: number;
};

type SlashSkillOptions = {
  player: PlayerController;
  getEnemies: () => EnemyWaveManager | undefined;
  playSound: (key: string, volume: number) => void;
};

export class SlashSkill {
  private scene: Phaser.Scene;
  private player: PlayerController;
  private getEnemies: () => EnemyWaveManager | undefined;
  private playSound: (key: string, volume: number) => void;
  private lastSlashAt = -SLASH_COOLDOWN;
  private slashId = 0;
  private projectiles: SlashProjectile[] = [];

  constructor(scene: Phaser.Scene, options: SlashSkillOptions) {
    this.scene = scene;
    this.player = options.player;
    this.getEnemies = options.getEnemies;
    this.playSound = options.playSound;
  }

  tryCast(time: number) {
    if (time - this.lastSlashAt < SLASH_COOLDOWN) {
      return;
    }

    const direction = this.player.facing;
    const x = this.player.body.x + direction * 42;
    const y = this.player.body.y - 44;
    const container = this.scene.add.container(x, y).setDepth(37);
    const slash = this.createSlashGraphic(direction, 1);
    const glint = this.scene.add.circle(-direction * 28, -4, 5, 0xffffff, 0.92);

    container.add([slash, glint]);
    container.setRotation(direction * -0.035);
    this.lastSlashAt = time;
    this.slashId += 1;
    this.player.playAttackAnimation();
    this.projectiles.push({
      container,
      startX: x,
      direction,
      hitId: 100000 + this.slashId,
      trailElapsed: 0,
    });
    this.playSound('sfx-sword-slash', 0.44);

    this.scene.tweens.add({
      targets: container,
      scaleX: 1.16,
      scaleY: 0.9,
      duration: 85,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: glint,
      x: direction * 48,
      alpha: 0,
      duration: 130,
      ease: 'Quad.easeOut',
    });
  }

  update(dt: number) {
    const enemies = this.getEnemies();

    if (!enemies || this.projectiles.length === 0) {
      return;
    }

    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.container.x += projectile.direction * SLASH_SPEED * dt;
      projectile.trailElapsed += dt;
      const distance = Math.abs(projectile.container.x - projectile.startX);
      const progress = Phaser.Math.Clamp(distance / SLASH_RANGE, 0, 1);

      projectile.container.setAlpha(1 - progress * 0.55);
      projectile.container.setScale(1 + progress * 0.08, 1 - progress * 0.05);
      this.createSlashTrail(projectile);
      enemies.attackFromSlash(
        projectile.container.x,
        projectile.container.y,
        82,
        40,
        projectile.hitId,
        SLASH_DAMAGE,
        projectile.direction,
      );

      const outOfRange = distance >= SLASH_RANGE;
      const outOfWorld = projectile.container.x < WORLD_LEFT - 80 || projectile.container.x > WORLD_WIDTH + 80;

      if (outOfRange || outOfWorld) {
        projectile.container.destroy();
        return false;
      }

      return true;
    });
  }

  getCooldownProgress(time: number) {
    return Phaser.Math.Clamp((time - this.lastSlashAt) / SLASH_COOLDOWN, 0, 1);
  }

  destroy() {
    this.projectiles.forEach((projectile) => projectile.container.destroy());
    this.projectiles = [];
  }

  private createSlashTrail(projectile: SlashProjectile) {
    if (projectile.trailElapsed < 0.045) {
      return;
    }

    projectile.trailElapsed = 0;
    const trail = this.createSlashGraphic(projectile.direction, 0.34)
      .setPosition(projectile.container.x - projectile.direction * 36, projectile.container.y)
      .setRotation(projectile.container.rotation)
      .setDepth(36);

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.72,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => trail.destroy(),
    });
  }

  private createSlashGraphic(direction: 1 | -1, alpha: number) {
    const slash = this.scene.add.graphics();
    const glow = this.createCrescentPoints(direction, 1.22);
    const body = this.createCrescentPoints(direction, 1);
    const core = this.createCrescentPoints(direction, 0.72);

    slash.fillStyle(0x9fefff, 0.16 * alpha);
    slash.fillPoints(glow, true, true);
    slash.fillStyle(0xffffff, 0.92 * alpha);
    slash.fillPoints(body, true, true);
    slash.fillStyle(0xeaffff, 0.88 * alpha);
    slash.fillPoints(core.map((point) => new Phaser.Geom.Point(point.x - direction * 9, point.y * 0.72)), true, true);
    slash.lineStyle(2, 0xffffff, 0.9 * alpha);
    slash.beginPath();
    slash.moveTo(direction * 22, -18);
    slash.lineTo(direction * -42, -3);
    slash.strokePath();
    return slash;
  }

  private createCrescentPoints(direction: 1 | -1, scale: number) {
    const face = -direction;
    const outer = [
      new Phaser.Geom.Point(face * 38 * scale, -30 * scale),
      new Phaser.Geom.Point(face * 0 * scale, -37 * scale),
      new Phaser.Geom.Point(face * -34 * scale, -14 * scale),
      new Phaser.Geom.Point(face * -42 * scale, 2 * scale),
      new Phaser.Geom.Point(face * -30 * scale, 20 * scale),
      new Phaser.Geom.Point(face * 38 * scale, 30 * scale),
    ];
    const inner = [
      new Phaser.Geom.Point(face * 18 * scale, 18 * scale),
      new Phaser.Geom.Point(face * 7 * scale, 5 * scale),
      new Phaser.Geom.Point(face * 6 * scale, -5 * scale),
      new Phaser.Geom.Point(face * 18 * scale, -18 * scale),
    ];

    return [...outer, ...inner];
  }
}
