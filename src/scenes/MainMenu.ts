import Phaser from 'phaser';
import { getContinueLevelId } from '../levels/progress';

export class MainMenu extends Phaser.Scene {
  private title?: Phaser.GameObjects.Text;
  private creditsOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super('MainMenu');
  }

  preload() {
    this.load.image('menu-bg', '/assets/bg/menu.png');
    this.load.spritesheet('menu-player-idle', '/assets/Character/Idle/Idle-Sheet.png', {
      frameWidth: 64,
      frameHeight: 80,
    });
  }

  create() {
    const { width, height } = this.scale;

    if (this.textures.exists('menu-bg')) {
      const bg = this.add.image(width / 2, height / 2, 'menu-bg');
      const scale = Math.max(width / bg.frame.width, height / bg.frame.height);
      bg.setScale(scale);
    } else {
      this.add.rectangle(0, 0, width, height, 0x081015).setOrigin(0);
    }

    this.createMenuAnimations();
    this.add.rectangle(0, 0, width, height, 0x03080b, 0.52).setOrigin(0);
    this.add.rectangle(0, 0, width, 152, 0x061015, 0.42).setOrigin(0);
    this.add.rectangle(0, height - 154, width, 154, 0x020507, 0.74).setOrigin(0);
    this.createMoon(width, height);
    this.createAtmosphere(height);
    const playerX = width * 0.38;
    const menuX = width * 0.72;

    this.createHeroFrame(playerX, height);

    this.title = this.add
      .text(width / 2, height * 0.18, 'MOONLIT HOLLOW', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#eef8ff',
        stroke: '#020609',
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.add
      .text(width / 2, height * 0.285, 'NIGHT HUNT', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#aeefff',
        stroke: '#05080a',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.add
      .text(width / 2, height * 0.335, 'A quiet blade. A cursed forest. One more night.', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#d8e9ec',
        stroke: '#020609',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(9);

    const playerShadow = this.add
      .ellipse(playerX, height * 0.725, 190, 36, 0x000000, 0.42)
      .setDepth(4);
    const playerGlow = this.add
      .ellipse(playerX, height * 0.62, 154, 212, 0xaeefff, 0.08)
      .setDepth(3);
    const player = this.add
      .sprite(playerX, height * 0.71, 'menu-player-idle')
      .setOrigin(0.5, 1)
      .setScale(2.55)
      .setDepth(5)
      .play('menu-player-idle');

    this.tweens.add({
      targets: [player, playerGlow],
      y: '-=6',
      duration: 1450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: playerShadow,
      scaleX: 0.94,
      alpha: 0.28,
      duration: 1450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.createMenuPanel(menuX, height);
    this.createMenuButton(menuX, 278, 'START GAME', () => this.startGame());
    this.createMenuButton(menuX, 346, 'CONTINUE', () => this.continueGame());
    this.createMenuButton(menuX, 414, 'CREDITS', () => this.showCredits());

    this.add
      .text(menuX, height * 0.895, `BEST SCORE  ${this.getBestScore()}`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#f5d77d',
        stroke: '#05080a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.add
      .text(menuX, height * 0.94, 'ENTER / SPACE: LEVEL SELECT', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#9eb3ba',
        stroke: '#05080a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.createCreditsOverlay(width, height);
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-ESC', () => this.hideCredits());

    this.tweens.add({
      targets: this.title,
      y: this.title.y - 4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startGame() {
    this.cameras.main.fadeOut(260, 4, 8, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('LevelSelect');
    });
  }

  private continueGame() {
    this.cameras.main.fadeOut(260, 4, 8, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('GameScene', { levelId: getContinueLevelId() });
    });
  }

  private createAtmosphere(height: number) {
    for (let i = 0; i < 7; i += 1) {
      const mist = this.add
        .rectangle(-160 + i * 175, height * 0.7 + i * 6, 210, 8, 0xb9d4dc, 0.06)
        .setOrigin(0)
        .setDepth(2);

      this.tweens.add({
        targets: mist,
        x: mist.x + 130,
        alpha: 0.03,
        duration: 2600 + i * 380,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createHeroFrame(x: number, height: number) {
    this.add.rectangle(x, height * 0.705, 252, 5, 0x95eaff, 0.52).setDepth(3);
    this.add.rectangle(x, height * 0.748, 382, 2, 0xe6f8ff, 0.18).setDepth(3);
    this.add.rectangle(x - 152, height * 0.7, 4, 58, 0x95eaff, 0.26).setDepth(3);
    this.add.rectangle(x + 152, height * 0.7, 4, 58, 0x95eaff, 0.26).setDepth(3);
  }

  private createMenuPanel(x: number, height: number) {
    this.add
      .rectangle(x, height * 0.64, 328, 264, 0x061015, 0.64)
      .setStrokeStyle(2, 0xbff4ff, 0.28)
      .setDepth(8);
    this.add.rectangle(x, 212, 238, 2, 0xbff4ff, 0.34).setDepth(9);
    this.add
      .text(x, 190, 'MAIN MENU', {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#bff4ff',
        stroke: '#05080a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private createMenuButton(x: number, y: number, label: string, onClick: () => void) {
    const shadow = this.add.rectangle(0, 7, 258, 58, 0x020709, 0.62);
    const panel = this.add
      .rectangle(0, 0, 258, 58, 0xbff4ff, 0.96)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const inner = this.add.rectangle(0, 0, 236, 38, 0x0c2a31, 0.1).setStrokeStyle(1, 0x08242b, 0.42);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#031014',
        stroke: '#eaffff',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    panel.on('pointerdown', onClick);
    const button = this.add.container(x, y, [shadow, panel, inner, text]).setDepth(10);

    panel.on('pointerover', () => {
      panel.setFillStyle(0xe8fcff, 1);
      button.setScale(1.04);
    });
    panel.on('pointerout', () => {
      panel.setFillStyle(0xbff4ff, 0.96);
      button.setScale(1);
    });
    this.tweens.add({
      targets: button,
      y: y - 3,
      duration: 920,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return button;
  }

  private createCreditsOverlay(width: number, height: number) {
    const blocker = this.add
      .rectangle(0, 0, width, height, 0x020507, 0.72)
      .setOrigin(0)
      .setInteractive();
    const panel = this.add
      .rectangle(width / 2, height / 2, 430, 230, 0x061015, 0.94)
      .setStrokeStyle(3, 0xbff4ff, 0.72);
    const title = this.add
      .text(width / 2, height / 2 - 70, 'CREDITS', {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#eef8ff',
        stroke: '#04080a',
        strokeThickness: 7,
      })
      .setOrigin(0.5);
    const body = this.add
      .text(width / 2, height / 2, 'Game by RyuDEV\nThanks for playing', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#cfe9ee',
        align: 'center',
        stroke: '#04080a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const close = this.createMenuButton(width / 2, height / 2 + 86, 'CLOSE', () => this.hideCredits());

    close.setScale(0.72);
    this.creditsOverlay = this.add
      .container(0, 0, [blocker, panel, title, body, close])
      .setDepth(40)
      .setVisible(false);
  }

  private showCredits() {
    this.creditsOverlay?.setVisible(true);
  }

  private hideCredits() {
    this.creditsOverlay?.setVisible(false);
  }

  private createMoon(width: number, height: number) {
    const moon = this.add.circle(width * 0.78, height * 0.22, 38, 0xd9f8ff, 0.18).setDepth(1);
    const core = this.add.circle(width * 0.78, height * 0.22, 24, 0xeefcff, 0.28).setDepth(1);

    this.tweens.add({
      targets: [moon, core],
      alpha: '+=0.08',
      scale: 1.04,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createMenuAnimations() {
    this.createAnimation('menu-player-idle', 'menu-player-idle', 0, 3, 6, -1);
  }

  private createAnimation(
    key: string,
    texture: string,
    start: number,
    end: number,
    frameRate: number,
    repeat: number,
  ) {
    if (this.anims.exists(key)) {
      return;
    }

    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(texture, { start, end }),
      frameRate,
      repeat,
    });
  }

  private getBestScore() {
    return Number.parseInt(window.localStorage.getItem('moonlit-best-score') ?? '0', 10) || 0;
  }
}
