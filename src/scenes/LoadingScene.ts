import Phaser from 'phaser';
import { loadGameAssets } from '../game/assets';
import { toggleFullscreen } from '../game/fullscreen';
import { getLevelById } from '../levels';

type LoadingData = {
  levelId?: string;
};

export class LoadingScene extends Phaser.Scene {
  private levelId = 'level-1-forest';
  private progressFill?: Phaser.GameObjects.Rectangle;
  private percentText?: Phaser.GameObjects.Text;
  private readonly tips = [
    'Time your attack after enemies commit.',
    'Moon Slash can pierce crowded enemies.',
    'Flying enemies are safer to hit after they dive.',
    'Boss attacks are strongest when you stand still.',
    'Use fullscreen on mobile for better controls.',
  ];

  constructor() {
    super('LoadingScene');
  }

  init(data: LoadingData = {}) {
    this.levelId = data.levelId ?? this.levelId;
  }

  preload() {
    const level = getLevelById(this.levelId);

    this.createLoadingView(level.title);
    loadGameAssets(this, level);

    this.load.on('progress', (value: number) => {
      this.progressFill?.setSize(420 * value, 12);
      this.percentText?.setText(`${Math.round(value * 100)}%`);
    });
  }

  create() {
    this.progressFill?.setSize(420, 12);
    this.percentText?.setText('100%');

    this.time.delayedCall(180, () => {
      this.scene.start('GameScene', { levelId: this.levelId });
    });
  }

  private createLoadingView(levelTitle: string) {
    const { width, height } = this.scale;
    const tip = this.tips[Phaser.Math.Between(0, this.tips.length - 1)];

    this.add.rectangle(0, 0, width, height, 0x05080a, 1).setOrigin(0);
    this.createUtilityButton(width - 64, 42, 'FULL', () => toggleFullscreen(this));

    for (let i = 0; i < 9; i += 1) {
      const mist = this.add
        .rectangle(-120 + i * 140, height * 0.62 + (i % 3) * 18, 170, 8, 0xb9d4dc, 0.06)
        .setOrigin(0);

      this.tweens.add({
        targets: mist,
        x: mist.x + 90,
        alpha: 0.025,
        duration: 1500 + i * 150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.add
      .text(width / 2, height / 2 - 74, 'MOONLIT HOLLOW', {
        fontFamily: 'monospace',
        fontSize: '38px',
        color: '#eef8ff',
        stroke: '#020609',
        strokeThickness: 9,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 28, levelTitle.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#f5d77d',
        stroke: '#05080a',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .rectangle(width / 2, height / 2 + 32, 452, 34, 0x061015, 0.9)
      .setStrokeStyle(2, 0x8fd7ff, 0.42);
    this.add.rectangle(width / 2, height / 2 + 12, 392, 2, 0xffffff, 0.12);
    this.add.rectangle(width / 2 - 210, height / 2 + 32, 420, 12, 0x0b1114, 0.95).setOrigin(0, 0.5);
    this.progressFill = this.add
      .rectangle(width / 2 - 210, height / 2 + 32, 0, 12, 0x8fd7ff, 1)
      .setOrigin(0, 0.5);
    this.percentText = this.add
      .text(width / 2, height / 2 + 70, '0%', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#dbe7ea',
        stroke: '#05080a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 112, `TIP  ${tip}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#9eb3ba',
        stroke: '#05080a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
  }

  private createUtilityButton(x: number, y: number, label: string, onClick: () => void) {
    const shadow = this.add.rectangle(0, 4, 78, 40, 0x020709, 0.58);
    const panel = this.add
      .rectangle(0, 0, 78, 40, 0x14262c, 0.92)
      .setStrokeStyle(2, 0xbff4ff, 0.56)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#eef8ff',
        stroke: '#05080a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const button = this.add.container(x, y, [shadow, panel, text]).setDepth(10);

    panel.on('pointerdown', onClick);
    panel.on('pointerover', () => {
      panel.setFillStyle(0x1d3b44, 1);
      button.setScale(1.04);
    });
    panel.on('pointerout', () => {
      panel.setFillStyle(0x14262c, 0.92);
      button.setScale(1);
    });
  }
}
