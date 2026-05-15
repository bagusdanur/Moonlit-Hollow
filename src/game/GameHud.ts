import Phaser from 'phaser';
import { PLAYER_MAX_HP } from './config';
import type { LevelConfig } from '../levels/types';

type GameHudOptions = {
  level: LevelConfig;
  hasSlashSkill: boolean;
  showKeyboardHints: boolean;
};

type EndScreenAction = {
  label: string;
  primary?: boolean;
  onClick: () => void;
};

export class GameHud {
  private scene: Phaser.Scene;
  private level: LevelConfig;
  private hasSlashSkill: boolean;
  private showKeyboardHints: boolean;
  private hpBarFill?: Phaser.GameObjects.Rectangle;
  private scoreText?: Phaser.GameObjects.Text;
  private waveText?: Phaser.GameObjects.Text;
  private messageText?: Phaser.GameObjects.Text;
  private centerWaveText?: Phaser.GameObjects.Text;
  private attackCooldownFill?: Phaser.GameObjects.Rectangle;
  private dashCooldownFill?: Phaser.GameObjects.Rectangle;
  private slashCooldownFill?: Phaser.GameObjects.Rectangle;
  private endOverlay?: Phaser.GameObjects.Rectangle;
  private endActions?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, options: GameHudOptions) {
    this.scene = scene;
    this.level = options.level;
    this.hasSlashSkill = options.hasSlashSkill;
    this.showKeyboardHints = options.showKeyboardHints;
  }

  create() {
    this.scene.add
      .rectangle(10, 12, 306, 86, 0x061015, 0.72)
      .setOrigin(0)
      .setStrokeStyle(2, 0x8fd7ff, 0.36)
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
    if (this.showKeyboardHints) {
      this.scene.add
      .rectangle(14, 485, 560, 42, 0x061015, 0.62)
      .setOrigin(0)
        .setStrokeStyle(1, 0x8fd7ff, 0.28)
        .setScrollFactor(0)
        .setDepth(49);
      this.scene.add
        .text(22, 509, 'Move A/D or arrows   Jump W/Up/Space   Attack J/X   Dash Shift   Restart R', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#dbe7ea',
          stroke: '#05080a',
          strokeThickness: 4,
        })
        .setScrollFactor(0)
        .setDepth(50);
    }

    if (this.hasSlashSkill && this.showKeyboardHints) {
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
    }

    if (this.hasSlashSkill) {
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
      .rectangle(748, 64, 184, this.hasSlashSkill ? 110 : 74, 0x061015, 0.72)
      .setOrigin(0)
      .setStrokeStyle(2, 0x8fd7ff, 0.36)
      .setScrollFactor(0)
      .setDepth(49);
    this.scene.add.rectangle(768, 74, 126, 10, 0x0b1114, 0.9).setOrigin(0).setScrollFactor(0).setDepth(51);
    this.attackCooldownFill = this.scene.add
      .rectangle(768, 74, 126, 10, 0x8fd7ff, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(52);
    this.scene.add
      .text(768, 89, 'ATTACK', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#dbe7ea',
        stroke: '#05080a',
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(52);

    this.scene.add.rectangle(768, 110, 126, 10, 0x0b1114, 0.9).setOrigin(0).setScrollFactor(0).setDepth(51);
    this.dashCooldownFill = this.scene.add
      .rectangle(768, 110, 126, 10, 0x9df7ff, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(52);
    this.scene.add
      .text(768, 124, 'DASH', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#dbe7ea',
        stroke: '#05080a',
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(52);

    if (this.hasSlashSkill) {
      this.scene.add.rectangle(768, 146, 126, 10, 0x0b1114, 0.9).setOrigin(0).setScrollFactor(0).setDepth(51);
      this.slashCooldownFill = this.scene.add
        .rectangle(768, 146, 126, 10, 0x74f7ff, 1)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(52);
      this.scene.add
        .text(768, 160, 'SLASH', {
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
      this.attackCooldownFill.width = 126 * progress;
    }
  }

  updateDashCooldown(progress: number) {
    if (this.dashCooldownFill) {
      this.dashCooldownFill.width = 126 * progress;
    }
  }

  updateSlashCooldown(progress: number) {
    if (this.slashCooldownFill) {
      this.slashCooldownFill.width = 126 * progress;
    }
  }

  setWave(waveIndex: number) {
    const waveName = this.level.waveNames[waveIndex - 1] ?? `Wave ${waveIndex}`;

    this.waveText?.setText(`${this.level.shortTitle}  Wave ${waveIndex}: ${waveName}`);
    this.showWaveIntro(waveIndex, waveName);
  }

  showEndScreen(
    title: string,
    color: string,
    score: number,
    footer = 'Press R to restart',
    rewardText = '',
    endButtons: EndScreenAction[] = [],
  ) {
    if (!this.endOverlay) {
      this.endOverlay = this.scene.add
        .rectangle(0, 0, 960, 540, 0x05070a, 0)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(59);
    }

    this.endActions?.destroy(true);
    this.endActions = undefined;

    this.scene.tweens.add({
      targets: this.endOverlay,
      alpha: 0.72,
      duration: 260,
    });

    this.messageText?.setText('').setAlpha(0);

    const isVictory = title === 'VICTORY';
    const panelWidth = endButtons.length >= 3 ? 560 : 470;
    const panelHeight = rewardText ? 286 : 258;
    const panelFill = 0x061015;
    const accent = 0x8fd7ff;
    const titleColor = isVictory ? '#d9ffcc' : color;
    const actions: Phaser.GameObjects.GameObject[] = [
      this.scene.add.rectangle(0, 10, panelWidth, panelHeight, 0x020507, 0.62),
      this.scene.add
        .rectangle(0, 0, panelWidth, panelHeight, panelFill, 0.9)
        .setStrokeStyle(3, accent, 0.5),
      this.scene.add.rectangle(0, -panelHeight / 2 + 21, panelWidth - 62, 3, accent, 0.62),
      this.scene.add.rectangle(0, panelHeight / 2 - 42, panelWidth - 62, 2, 0xdff4ff, 0.16),
      this.scene.add
        .text(0, -62, title, {
          fontFamily: 'monospace',
          fontSize: '40px',
          color: titleColor,
          stroke: '#05080a',
          strokeThickness: 9,
        })
        .setOrigin(0.5),
      this.scene.add
        .text(0, -14, `SCORE  ${score}`, {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: '#eef8ff',
          stroke: '#05080a',
          strokeThickness: 6,
        })
        .setOrigin(0.5),
      this.scene.add
        .text(0, 28, footer.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#b7c9cf',
          stroke: '#05080a',
          strokeThickness: 4,
        })
        .setOrigin(0.5),
    ];

    if (rewardText) {
      actions.push(
        this.scene.add
          .rectangle(0, 54, 368, 34, 0x0c252b, 0.86)
          .setStrokeStyle(1, 0xbff4ff, 0.48),
        this.scene.add
          .text(0, 54, rewardText.toUpperCase(), {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#bff4ff',
            stroke: '#05080a',
            strokeThickness: 4,
          })
          .setOrigin(0.5),
      );
    }

    const buttonGap = endButtons.length >= 3 ? 168 : 172;
    const startX = -((endButtons.length - 1) * buttonGap) / 2;

    for (const [index, button] of endButtons.entries()) {
      actions.push(
        this.createEndButton(
          startX + index * buttonGap,
          rewardText ? 106 : 86,
          button.label,
          button.onClick,
          Boolean(button.primary),
        ),
      );
    }

    this.endActions = this.scene.add
      .container(480, 288, actions)
      .setScrollFactor(0)
      .setDepth(78)
      .setAlpha(0)
      .setScale(0.94);
    this.scene.tweens.add({
      targets: this.endActions,
      alpha: 1,
      scale: 1,
      y: 278,
      duration: 280,
      ease: 'Back.easeOut',
    });
  }

  private createEndButton(x: number, y: number, label: string, onClick: () => void, primary: boolean) {
    const width = 154;
    const shadow = this.scene.add.rectangle(0, 7, width, 48, 0x020709, 0.62);
    const panel = this.scene.add
      .rectangle(0, 0, width, 48, primary ? 0xbff4ff : 0x14262c, primary ? 0.96 : 0.92)
      .setStrokeStyle(2, primary ? 0xffffff : 0xbff4ff, primary ? 0.86 : 0.56)
      .setInteractive({ useHandCursor: true });
    const topLine = this.scene.add.rectangle(0, -16, width - 24, 2, 0xffffff, primary ? 0.42 : 0.18);
    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: label.length > 6 ? '17px' : '21px',
        color: primary ? '#061115' : '#eef8ff',
        stroke: primary ? '#eaffff' : '#05080a',
        strokeThickness: primary ? 2 : 5,
      })
      .setOrigin(0.5);
    const button = this.scene.add.container(x, y, [shadow, panel, topLine, text]).setScrollFactor(0);

    panel.on('pointerdown', onClick);
    panel.on('pointerover', () => {
      panel.setFillStyle(primary ? 0xffffff : 0x1d3b44, 1);
      button.setScale(1.04);
    });
    panel.on('pointerout', () => {
      panel.setFillStyle(primary ? 0xbff4ff : 0x14262c, primary ? 0.96 : 0.92);
      button.setScale(1);
    });

    return button;
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
