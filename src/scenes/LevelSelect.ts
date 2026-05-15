import Phaser from 'phaser';
import { toggleFullscreen } from '../game/fullscreen';
import { isLevelCompleted, isLevelUnlocked } from '../levels/progress';

const CARD_WIDTH = 246;
const CARD_HEIGHT = 190;

export class LevelSelect extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  preload() {
    if (!this.textures.exists('menu-bg')) {
      this.load.image('menu-bg', '/assets/bg/menu.png');
    }
  }

  create() {
    const { width, height } = this.scale;

    this.createBackground(width, height);
    this.add
      .text(width / 2, 70, 'SELECT LEVEL', {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: '#eef8ff',
        stroke: '#04080a',
        strokeThickness: 9,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 120, 'Choose your hunt', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#bff4ff',
        stroke: '#05080a',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add.rectangle(width / 2, 145, 360, 2, 0xbff4ff, 0.26);
    this.createBackButton(76, 42);
    this.createUtilityButton(width - 64, 42, 'FULL', () => toggleFullscreen(this));
    const level1Done = isLevelCompleted('level-1-forest');
    const level2Done = isLevelCompleted('level-2-castle');
    const level2Locked = !isLevelUnlocked('level-2-castle');

    this.createLevelCard(214, 292, 1, 'FOREST', level1Done ? 'Cleared' : 'Ready', false, () =>
      this.startLevel('level-1-forest'),
    );
    this.createLevelCard(480, 292, 2, 'CASTLE', level2Done ? 'Cleared' : 'Hard', level2Locked, () =>
      this.startLevel('level-2-castle'),
    );
    this.createLevelCard(746, 292, 3, 'RUINS', 'Locked', true);

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MainMenu'));
    this.input.keyboard?.once('keydown-ENTER', () => this.startLevel('level-1-forest'));
  }

  private createBackground(width: number, height: number) {
    if (this.textures.exists('menu-bg')) {
      const bg = this.add.image(width / 2, height / 2, 'menu-bg');
      const scale = Math.max(width / bg.frame.width, height / bg.frame.height);
      bg.setScale(scale);
    } else {
      this.add.rectangle(0, 0, width, height, 0x081015).setOrigin(0);
    }

    this.add.rectangle(0, 0, width, height, 0x05080a, 0.48).setOrigin(0);
    this.add.rectangle(0, height - 126, width, 126, 0x030608, 0.66).setOrigin(0);
    this.add.rectangle(width / 2, height - 122, 760, 3, 0xaeefff, 0.16);
  }

  private createBackButton(x: number, y: number) {
    const shadow = this.add.rectangle(0, 4, 112, 40, 0x020709, 0.58);
    const panel = this.add
      .rectangle(0, 0, 112, 40, 0x14262c, 0.92)
      .setStrokeStyle(2, 0xbff4ff, 0.56)
      .setInteractive({ useHandCursor: true });
    const topLine = this.add.rectangle(0, -12, 82, 2, 0xffffff, 0.16);
    const label = this.add
      .text(0, 0, 'BACK', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#eef8ff',
        stroke: '#05080a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const button = this.add.container(x, y, [shadow, panel, topLine, label]);

    panel.on('pointerover', () => {
      button.setScale(1.04);
      panel.setFillStyle(0x1d3b44, 1);
    });
    panel.on('pointerout', () => {
      button.setScale(1);
      panel.setFillStyle(0x14262c, 0.92);
    });
    panel.on('pointerdown', () => this.scene.start('MainMenu'));
  }

  private createUtilityButton(x: number, y: number, label: string, onClick: () => void) {
    const shadow = this.add.rectangle(0, 4, 78, 40, 0x020709, 0.58);
    const panel = this.add
      .rectangle(0, 0, 78, 40, 0x14262c, 0.92)
      .setStrokeStyle(2, 0xbff4ff, 0.56)
      .setInteractive({ useHandCursor: true });
    const topLine = this.add.rectangle(0, -12, 52, 2, 0xffffff, 0.16);
    const labelText = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#eef8ff',
        stroke: '#05080a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const button = this.add.container(x, y, [shadow, panel, topLine, labelText]);

    panel.on('pointerdown', onClick);
    panel.on('pointerover', () => {
      button.setScale(1.04);
      panel.setFillStyle(0x1d3b44, 1);
    });
    panel.on('pointerout', () => {
      button.setScale(1);
      panel.setFillStyle(0x14262c, 0.92);
    });
  }

  private createLevelCard(
    x: number,
    y: number,
    level: number,
    title: string,
    status: string,
    locked: boolean,
    onClick?: () => void,
  ) {
    const fill = locked ? 0x111719 : 0x061015;
    const stroke = locked ? 0x4b5558 : 0x9fe8ff;
    const labelColor = locked ? '#76858a' : '#eef8ff';
    const statusColor = locked ? '#879397' : '#f5d77d';
    const container = this.add.container(x, y);
    const shadow = this.add.rectangle(0, 10, CARD_WIDTH, CARD_HEIGHT, 0x020709, 0.55);
    const panel = this.add
      .rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, fill, locked ? 0.86 : 0.94)
      .setStrokeStyle(3, stroke, locked ? 0.52 : 0.92);
    const topBar = this.add.rectangle(0, -CARD_HEIGHT / 2 + 18, CARD_WIDTH - 24, 4, locked ? 0x556165 : 0xbff4ff, locked ? 0.22 : 0.68);
    const badge = this.add
      .rectangle(-CARD_WIDTH / 2 + 50, -CARD_HEIGHT / 2 + 42, 76, 30, locked ? 0x273034 : 0xf5d77d, locked ? 0.62 : 0.94)
      .setStrokeStyle(1, 0xffffff, locked ? 0.12 : 0.42);

    container.add([shadow, panel, topBar, badge]);
    container.add(
      this.add
        .text(-CARD_WIDTH / 2 + 50, -CARD_HEIGHT / 2 + 42, `LV ${level}`, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: locked ? '#9aa7ab' : '#071115',
          stroke: '#05080a',
          strokeThickness: locked ? 4 : 0,
        })
        .setOrigin(0.5),
    );
    container.add(
      this.add
        .text(0, -12, title, {
          fontFamily: 'monospace',
          fontSize: '30px',
          color: labelColor,
          stroke: '#05080a',
          strokeThickness: 7,
        })
        .setOrigin(0.5),
    );
    container.add(
      this.add
        .text(0, 42, locked ? 'LOCKED' : status.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: statusColor,
          stroke: '#05080a',
          strokeThickness: 4,
        })
        .setOrigin(0.5),
    );
    container.add(
      this.add
        .rectangle(0, 74, 162, 30, locked ? 0x1a2023 : 0xbff4ff, locked ? 0.4 : 0.94)
        .setStrokeStyle(1, locked ? 0x4b5558 : 0xffffff, locked ? 0.28 : 0.58),
    );
    container.add(
      this.add
        .text(0, 74, locked ? 'COMING SOON' : 'PLAY', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: locked ? '#7c898e' : '#051115',
          stroke: '#eaffff',
          strokeThickness: locked ? 0 : 1,
        })
        .setOrigin(0.5),
    );

    if (!locked && onClick) {
      panel.setInteractive({ useHandCursor: true });
      panel.on('pointerover', () => {
        container.setScale(1.04);
        panel.setFillStyle(0x15343a, 0.98);
        topBar.setFillStyle(0xffffff, 0.82);
      });
      panel.on('pointerout', () => {
        container.setScale(1);
        panel.setFillStyle(fill, 0.94);
        topBar.setFillStyle(0xbff4ff, 0.68);
      });
      panel.on('pointerdown', onClick);
    }

    if (locked) {
      container.add(
        this.add
          .text(0, 6, 'LOCK', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#556165',
            stroke: '#05080a',
            strokeThickness: 5,
          })
          .setOrigin(0.5),
      );
    }
  }

  private startLevel(levelId: string) {
    this.cameras.main.fadeOut(220, 4, 8, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('LoadingScene', { levelId });
    });
  }
}
