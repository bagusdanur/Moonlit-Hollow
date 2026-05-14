import Phaser from 'phaser';
import { PLAYER_MAX_HP } from './config';
import type { LevelConfig } from '../levels/types';

type GameHudOptions = {
  level: LevelConfig;
  hasSlashSkill: boolean;
};

export class GameHud {
  private scene: Phaser.Scene;
  private level: LevelConfig;
  private hasSlashSkill: boolean;
  private hpBarFill?: Phaser.GameObjects.Rectangle;
  private scoreText?: Phaser.GameObjects.Text;
  private waveText?: Phaser.GameObjects.Text;
  private messageText?: Phaser.GameObjects.Text;
  private centerWaveText?: Phaser.GameObjects.Text;
  private attackCooldownFill?: Phaser.GameObjects.Rectangle;
  private slashCooldownFill?: Phaser.GameObjects.Rectangle;
  private endOverlay?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, options: GameHudOptions) {
    this.scene = scene;
    this.level = options.level;
    this.hasSlashSkill = options.hasSlashSkill;
  }

  create() {
    this.scene.add
      .rectangle(10, 12, 306, 86, 0x061015, 0.78)
      .setOrigin(0)
      .setStrokeStyle(2, 0x8fd7ff, 0.28)
      .setScrollFactor(0)
      .setDepth(49);
    this.scene.add.rectangle(18, 19, 168, 20, 0x080c0f, 0.92).setOrigin(0).setScrollFactor(0).setDepth(50);
    this.scene.add.rectangle(24, 29, 156, 10, 0x3c1822, 1).setOrigin(0, 0.5).setScrollFactor(0).setDepth(51);
    this.hpBarFill = this.scene.add
      .rectangle(24, 29, 156, 10, 0xd84a5b, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(52);
    this.scene.add
      .text(196, 19, 'HP', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffb7c0',
        stroke: '#05080a',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(52);
    this.scoreText = this.scene.add
      .text(20, 48, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#c7e6ff',
        stroke: '#05080a',
        strokeThickness: 5,
      })
      .setScrollFactor(0)
      .setDepth(50);
    this.waveText = this.scene.add
      .text(20, 72, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#f6d98b',
        stroke: '#05080a',
        strokeThickness: 5,
      })
      .setScrollFactor(0)
      .setDepth(50);
    this.scene.add
      .rectangle(14, 485, 560, 42, 0x061015, 0.58)
      .setOrigin(0)
      .setStrokeStyle(1, 0x8fd7ff, 0.18)
      .setScrollFactor(0)
      .setDepth(49);
    this.scene.add
      .text(22, 509, 'Move A/D or arrows   Jump W/Up/Space   Attack J/X   Restart R', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#dbe7ea',
        stroke: '#05080a',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(50);

    if (this.hasSlashSkill) {
      this.scene.add
        .text(22, 490, 'SKILL K READY', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#bff6ff',
          stroke: '#05080a',
          strokeThickness: 4,
        })
        .setScrollFactor(0)
        .setDepth(50);
      this.scene.time.delayedCall(420, () => this.showSkillUnlockBanner());
    }

    this.messageText = this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2, '', {
        fontFamily: 'monospace',
        fontSize: '42px',
        color: '#ffdfdf',
        align: 'center',
        stroke: '#12090a',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60);
    this.centerWaveText = this.scene.add
      .text(this.scene.scale.width / 2, 164, '', {
        fontFamily: 'monospace',
        fontSize: '34px',
        color: '#fff2bd',
        align: 'center',
        stroke: '#130d08',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0)
      .setDepth(58);

    this.scene.add
      .rectangle(764, 14, 180, this.hasSlashSkill ? 84 : 44, 0x061015, 0.78)
      .setOrigin(0)
      .setStrokeStyle(2, 0x8fd7ff, 0.26)
      .setScrollFactor(0)
      .setDepth(49);
    this.scene.add.rectangle(784, 24, 122, 11, 0x0b1114, 0.9).setOrigin(0).setScrollFactor(0).setDepth(51);
    this.attackCooldownFill = this.scene.add
      .rectangle(784, 24, 122, 11, 0x8fd7ff, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(52);
    this.scene.add
      .text(784, 40, 'ATTACK', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#dbe7ea',
        stroke: '#05080a',
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(52);

    if (this.hasSlashSkill) {
      this.scene.add.rectangle(784, 66, 122, 11, 0x0b1114, 0.9).setOrigin(0).setScrollFactor(0).setDepth(51);
      this.slashCooldownFill = this.scene.add
        .rectangle(784, 66, 122, 11, 0x74f7ff, 1)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(52);
      this.scene.add
        .text(784, 82, 'SLASH K', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#dbe7ea',
          stroke: '#05080a',
          strokeThickness: 3,
        })
        .setScrollFactor(0)
        .setDepth(52);
    }
  }

  updateStats(hp: number, score: number) {
    if (this.hpBarFill) {
      this.hpBarFill.width = 156 * (hp / PLAYER_MAX_HP);
    }

    this.scoreText?.setText(`Score ${score}`);
  }

  updateAttackCooldown(progress: number) {
    if (this.attackCooldownFill) {
      this.attackCooldownFill.width = 122 * progress;
    }
  }

  updateSlashCooldown(progress: number) {
    if (this.slashCooldownFill) {
      this.slashCooldownFill.width = 122 * progress;
    }
  }

  setWave(waveIndex: number) {
    const waveName = this.level.waveNames[waveIndex - 1] ?? `Wave ${waveIndex}`;

    this.waveText?.setText(`${this.level.shortTitle}  Wave ${waveIndex}: ${waveName}`);
    this.showWaveIntro(waveIndex, waveName);
  }

  showEndScreen(title: string, color: string, score: number, footer = 'Press R to restart') {
    if (!this.endOverlay) {
      this.endOverlay = this.scene.add
        .rectangle(0, 0, 960, 540, 0x05070a, 0)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(59);
    }

    this.scene.tweens.add({
      targets: this.endOverlay,
      alpha: 0.58,
      duration: 260,
    });
    this.messageText
      ?.setText(`${title}\nScore: ${score}\n${footer}`)
      .setColor(color)
      .setAlpha(0)
      .setScale(0.92);
    this.scene.tweens.add({
      targets: this.messageText,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  private showSkillUnlockBanner() {
    const panel = this.scene.add
      .rectangle(480, 106, 420, 52, 0x061215, 0.86)
      .setStrokeStyle(2, 0x99f4ff, 0.88)
      .setScrollFactor(0)
      .setDepth(76)
      .setAlpha(0);
    const text = this.scene.add
      .text(480, 106, 'SKILL UNLOCKED  -  MOON SLASH [K]', {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#eaffff',
        stroke: '#041014',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(77)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: [panel, text],
      alpha: 1,
      y: '-=8',
      duration: 260,
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: 1500,
      onComplete: () => {
        panel.destroy();
        text.destroy();
      },
    });
  }

  private showWaveIntro(waveIndex: number, name: string) {
    if (!this.centerWaveText) {
      return;
    }

    this.centerWaveText
      .setText(`${this.level.title.toUpperCase()}\nWAVE ${waveIndex} - ${name.toUpperCase()}`)
      .setAlpha(0)
      .setScale(0.92);
    this.scene.tweens.killTweensOf(this.centerWaveText);
    this.scene.tweens.add({
      targets: this.centerWaveText,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: 720,
    });
  }
}
