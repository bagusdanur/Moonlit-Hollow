import Phaser from 'phaser';
import type { EnemyKind, EnemyStats } from './enemies/types';

type BossViewEnemy = {
  kind: EnemyKind;
  sprite: Phaser.GameObjects.Sprite;
  hp: number;
  maxHp: number;
};

export class BossPresentation {
  private scene: Phaser.Scene;
  private bossEnemy?: BossViewEnemy;
  private bossHpBar?: Phaser.GameObjects.Graphics;
  private bossNameText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createArrival(
    enemy: BossViewEnemy,
    stats: EnemyStats,
    playAnimation: (key: string) => void,
    clearTint: () => void,
  ) {
    this.bossEnemy = enemy;
    this.createHpBar(enemy);
    enemy.sprite.setScale(stats.scale * 0.72);
    enemy.sprite.setTint(0xead6ff);
    playAnimation(stats.castAnim ?? stats.idleAnim);

    const overlay = this.scene.add
      .rectangle(0, 0, 960, 540, 0x050209, 0)
      .setOrigin(0)
      .setDepth(64)
      .setScrollFactor(0);
    const title = this.scene.add
      .text(480, 178, 'BRINGER OF DEATH', {
        fontFamily: 'monospace',
        fontSize: '34px',
        color: '#f2e8ff',
        stroke: '#17051f',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(74)
      .setScrollFactor(0);

    this.scene.cameras.main.shake(260, 0.0025);
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.5,
      duration: 180,
      yoyo: true,
      hold: 680,
      onComplete: () => overlay.destroy(),
    });
    this.scene.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1.08,
      duration: 240,
      yoyo: true,
      hold: 760,
      onComplete: () => title.destroy(),
    });
    this.scene.tweens.add({
      targets: enemy.sprite,
      scaleX: stats.scale,
      scaleY: stats.scale,
      duration: 620,
      ease: 'Back.easeOut',
    });

    for (let i = 0; i < 4; i += 1) {
      const ring = this.scene.add
        .circle(enemy.sprite.x, enemy.sprite.y - 46, 22, 0xa46cff, 0.2)
        .setDepth(8);

      this.scene.tweens.add({
        targets: ring,
        scale: 2.4 + i * 0.55,
        alpha: 0,
        duration: 760 + i * 160,
        delay: i * 160,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    this.scene.time.delayedCall(1200, clearTint);
  }

  createBossWarning(name: string) {
    const overlay = this.scene.add
      .rectangle(0, 0, 960, 540, 0x050209, 0)
      .setOrigin(0)
      .setDepth(64)
      .setScrollFactor(0);
    const lineTop = this.scene.add.rectangle(480, 214, 520, 3, 0xff98a9, 0).setDepth(73).setScrollFactor(0);
    const lineBottom = this.scene.add.rectangle(480, 316, 520, 3, 0x8fd7ff, 0).setDepth(73).setScrollFactor(0);
    const warning = this.scene.add
      .text(480, 246, 'BOSS APPROACHING', {
        fontFamily: 'monospace',
        fontSize: '34px',
        color: '#ffdfdf',
        stroke: '#05080a',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(74)
      .setScrollFactor(0);
    const bossName = this.scene.add
      .text(480, 286, name.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#bff4ff',
        stroke: '#05080a',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(74)
      .setScrollFactor(0);

    this.scene.cameras.main.shake(180, 0.0018);
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.42,
      duration: 180,
      yoyo: true,
      hold: 720,
      onComplete: () => overlay.destroy(),
    });
    this.scene.tweens.add({
      targets: [lineTop, lineBottom, warning, bossName],
      alpha: 1,
      duration: 180,
      yoyo: true,
      hold: 760,
      onComplete: () => {
        lineTop.destroy();
        lineBottom.destroy();
        warning.destroy();
        bossName.destroy();
      },
    });
  }

  createAttackWarning(enemy: BossViewEnemy, direction: 1 | -1) {
    const warning = this.scene.add
      .rectangle(enemy.sprite.x + direction * 34, enemy.sprite.y - 42, 82, 46, 0xff3d7f, 0.24)
      .setDepth(7)
      .setRotation(direction * -0.18);
    const edge = this.scene.add
      .rectangle(enemy.sprite.x + direction * 34, enemy.sprite.y - 42, 82, 5, 0xffe0ef, 0.62)
      .setDepth(8)
      .setRotation(direction * -0.18);

    this.scene.tweens.add({
      targets: [warning, edge],
      alpha: 0,
      scaleX: 1.12,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => {
        warning.destroy();
        edge.destroy();
      },
    });
  }

  updateHpBar(enemy = this.bossEnemy) {
    if (!enemy || !this.bossHpBar || !this.bossNameText) {
      return;
    }

    const width = 520;
    const height = 18;
    const x = 480 - width / 2;
    const y = 44;
    const fill = Phaser.Math.Clamp((enemy.hp / enemy.maxHp) * width, 0, width);

    this.bossHpBar.clear();
    this.bossHpBar.fillStyle(0x07050a, 0.92);
    this.bossHpBar.fillRect(x - 4, y - 4, width + 8, height + 8);
    this.bossHpBar.fillStyle(0x2c102f, 1);
    this.bossHpBar.fillRect(x, y, width, height);
    this.bossHpBar.fillStyle(0xb743ff, 1);
    this.bossHpBar.fillRect(x, y, fill, height);
    this.bossHpBar.lineStyle(2, 0xf2e8ff, 0.86);
    this.bossHpBar.strokeRect(x, y, width, height);
    this.bossNameText.setText(`BRINGER OF DEATH   ${Math.max(0, enemy.hp)}/${enemy.maxHp}`);
  }

  clear() {
    this.bossHpBar?.destroy();
    this.bossNameText?.destroy();
    this.bossHpBar = undefined;
    this.bossNameText = undefined;
    this.bossEnemy = undefined;
  }

  private createHpBar(enemy: BossViewEnemy) {
    this.clear();
    this.bossHpBar = this.scene.add.graphics().setDepth(72).setScrollFactor(0);
    this.bossNameText = this.scene.add
      .text(480, 28, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#f2e8ff',
        stroke: '#09020d',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(73)
      .setScrollFactor(0);
    this.updateHpBar(enemy);
  }
}
