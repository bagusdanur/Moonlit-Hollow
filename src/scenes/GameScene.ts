import Phaser from 'phaser';
import { createGameAnimations } from '../game/animations';
import { loadGameAssets } from '../game/assets';
import {
  GROUND_Y,
  HURT_COOLDOWN,
  PLAYER_MAX_HP,
  WORLD_HEIGHT,
  WORLD_LEFT,
  WORLD_WIDTH,
} from '../game/config';
import { EnemyWaveManager } from '../game/EnemyWaveManager';
import { GameHud } from '../game/GameHud';
import { PlayerController } from '../game/PlayerController';
import { SlashSkill } from '../game/SlashSkill';
import { getLevelById } from '../levels';
import { completeLevel } from '../levels/progress';
import type { LevelConfig } from '../levels/types';

type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys;
type GameKeys = Record<'W' | 'A' | 'D' | 'J' | 'K' | 'X' | 'R' | 'ESC', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private currentLevelId = 'level-1-forest';
  private level: LevelConfig = getLevelById();
  private cursors?: CursorKeys;
  private keys?: GameKeys;
  private platforms?: Phaser.Physics.Arcade.StaticGroup;
  private player?: PlayerController;
  private enemies?: EnemyWaveManager;
  private hp = PLAYER_MAX_HP;
  private score = 0;
  private lastHurtAt = -HURT_COOLDOWN;
  private isDead = false;
  private isWon = false;
  private hud?: GameHud;
  private slashSkill?: SlashSkill;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private isPausedGame = false;
  private lastAttackSoundId = 0;

  constructor() {
    super('GameScene');
  }

  init(data: { levelId?: string } = {}) {
    this.currentLevelId = data.levelId ?? this.currentLevelId;
    this.level = getLevelById(this.currentLevelId);
  }

  preload() {
    loadGameAssets(this, this.level);
  }

  create() {
    this.resetState();
    this.createFallbackTextures();
    this.createWorld();
    createGameAnimations(this);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,D,J,K,X,R,ESC') as GameKeys;
    this.player = new PlayerController(this, this.platforms!);
    this.enemies = new EnemyWaveManager(this, this.player, this.level, {
      onEnemyKilled: (points) => this.addScore(points),
      onEnemyDamaged: (x, y, damage) => this.showDamageNumber(x, y, damage),
      onPlayerHit: (direction, time, damage) => this.damagePlayer(direction, time, damage),
      onBoarDash: () => this.playSound('sfx-boar-dash', 0.38),
      onWaveChanged: (waveIndex) => this.setWave(waveIndex),
      onWin: () => this.winGame(),
    });
    this.slashSkill = this.isSlashSkillUnlocked()
      ? new SlashSkill(this, {
          player: this.player,
          getEnemies: () => this.enemies,
          playSound: (key, volume) => this.playSound(key, volume),
        })
      : undefined;

    this.createCamera();
    this.createHud();
    this.createPauseMenu();
    this.enemies.start();
  }

  update(time: number, delta: number) {
    if (!this.player || !this.enemies || !this.cursors || !this.keys) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.togglePause();
      return;
    }

    if (this.isPausedGame) {
      return;
    }

    if ((this.isDead || this.isWon) && Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.scene.restart();
      return;
    }

    if (this.isDead || this.isWon) {
      this.player.syncVisual();
      return;
    }

    this.player.update(time, this.cursors, this.keys);
    if (Phaser.Input.Keyboard.JustDown(this.keys.K) && this.isSlashSkillUnlocked()) {
      this.slashSkill?.tryCast(time);
    }
    this.playAttackSound();

    if (this.player.hasActiveAttackHitbox(time)) {
      this.enemies.attackFromPlayer(this.player.attackId);
    }

    this.enemies.update(time, delta / 1000);
    this.slashSkill?.update(delta / 1000);
    this.updateAttackCooldown(time);
    this.updateSlashCooldown(time);
  }

  private createWorld() {
    this.physics.world.setBounds(WORLD_LEFT, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x081015).setOrigin(0).setDepth(-40);
    this.addStaticBackground();

    this.platforms = this.physics.add.staticGroup();
    const ground = this.platforms.create(WORLD_WIDTH / 2, GROUND_Y + 40, 'ground-collider');
    ground.setVisible(false).setScale(WORLD_WIDTH / 16, 5).refreshBody();
  }

  private addStaticBackground() {
    if (!this.textures.exists(this.level.backgroundKey)) {
      return;
    }

    const bg = this.add
      .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, this.level.backgroundKey)
      .setScrollFactor(0)
      .setDepth(-30);
    const scale = Math.max(WORLD_WIDTH / bg.frame.width, WORLD_HEIGHT / bg.frame.height);

    bg.setScale(scale);
  }

  private createCamera() {
    if (!this.player) {
      return;
    }

    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }

  private createHud() {
    this.hud = new GameHud(this, {
      level: this.level,
      hasSlashSkill: this.isSlashSkillUnlocked(),
    });
    this.hud.create();
    this.updateHud();
  }

  private damagePlayer(direction: 1 | -1, time: number, damage = 1) {
    if (!this.player || time - this.lastHurtAt < HURT_COOLDOWN) {
      return;
    }

    this.lastHurtAt = time;
    this.hp = Math.max(0, this.hp - damage);
    this.player.hurt(direction, time);
    this.cameras.main.shake(90, 0.0025);
    this.createPlayerHitEffect(direction);
    this.updateHud();

    if (this.hp <= 0) {
      this.isDead = true;
      this.player.die();
      this.showEndScreen('YOU DIED', '#ffdfdf');
    }
  }

  private addScore(points: number) {
    this.score += points;
    this.updateHud();
  }

  private setWave(waveIndex: number) {
    this.hud?.setWave(waveIndex);
  }

  private winGame() {
    this.isWon = true;
    completeLevel(this.level.id);
    this.player?.body.setVelocity(0, 0);
    this.showEndScreen('VICTORY', '#d9ffcc', 'Returning to level select...');
    this.time.delayedCall(1600, () => {
      this.scene.start('LevelSelect');
    });
  }

  private updateHud() {
    this.hud?.updateStats(this.hp, this.score);
  }

  private resetState() {
    this.hp = PLAYER_MAX_HP;
    this.score = 0;
    this.lastHurtAt = -HURT_COOLDOWN;
    this.isDead = false;
    this.isWon = false;
    this.platforms = undefined;
    this.player = undefined;
    this.enemies?.destroyAll();
    this.enemies = undefined;
    this.hud = undefined;
    this.slashSkill?.destroy();
    this.slashSkill = undefined;
    this.pauseOverlay = undefined;
    this.isPausedGame = false;
    this.lastAttackSoundId = 0;
  }

  private createPauseMenu() {
    const overlay = this.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x030608, 0.68)
      .setOrigin(0)
      .setScrollFactor(0);
    const panel = this.add
      .rectangle(WORLD_WIDTH / 2, 278, 360, 302, 0x071115, 0.9)
      .setStrokeStyle(3, 0xbff4ff, 0.72)
      .setScrollFactor(0);
    const divider = this.add
      .rectangle(WORLD_WIDTH / 2, 198, 260, 2, 0xbff4ff, 0.32)
      .setScrollFactor(0);
    const title = this.add
      .text(WORLD_WIDTH / 2, 160, 'PAUSED', {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: '#eef8ff',
        stroke: '#04080a',
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const hint = this.add
      .text(WORLD_WIDTH / 2, 206, 'ESC TO RESUME', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#9eb3ba',
        stroke: '#04080a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const resume = this.createPauseButton(WORLD_WIDTH / 2, 248, 'RESUME', () => this.togglePause(false));
    const restart = this.createPauseButton(WORLD_WIDTH / 2, 306, 'RESTART', () => this.scene.restart());
    const menu = this.createPauseButton(WORLD_WIDTH / 2, 364, 'MAIN MENU', () => this.scene.start('MainMenu'));

    this.pauseOverlay = this.add
      .container(0, 0, [overlay, panel, divider, title, hint, resume, restart, menu])
      .setDepth(80)
      .setVisible(false);
  }

  private createPauseButton(x: number, y: number, label: string, onClick: () => void) {
    const shadow = this.add.rectangle(0, 5, 230, 46, 0x020709, 0.6).setScrollFactor(0);
    const panel = this.add
      .rectangle(0, 0, 230, 46, 0xdff4ff, 0.96)
      .setStrokeStyle(2, 0xffffff, 0.86)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#091114',
        stroke: '#eaffff',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const button = this.add.container(x, y, [shadow, panel, text]).setScrollFactor(0);

    panel.on('pointerover', () => {
      panel.setFillStyle(0xffffff, 1);
      button.setScale(1.04);
    });
    panel.on('pointerout', () => {
      panel.setFillStyle(0xdff4ff, 0.96);
      button.setScale(1);
    });
    panel.on('pointerdown', onClick);

    return button;
  }

  private togglePause(force?: boolean) {
    if (this.isDead || this.isWon) {
      return;
    }

    this.isPausedGame = force ?? !this.isPausedGame;
    this.pauseOverlay?.setVisible(this.isPausedGame);

    if (this.isPausedGame) {
      this.physics.world.pause();
      this.tweens.pauseAll();
    } else {
      this.physics.world.resume();
      this.tweens.resumeAll();
    }
  }

  private updateAttackCooldown(time: number) {
    this.hud?.updateAttackCooldown(this.player?.getAttackCooldownProgress(time) ?? 0);
  }

  private updateSlashCooldown(time: number) {
    this.hud?.updateSlashCooldown(this.slashSkill?.getCooldownProgress(time) ?? 0);
  }

  private isSlashSkillUnlocked() {
    return this.level.id === 'level-2-castle';
  }

  private playAttackSound() {
    if (!this.player || !this.player.isAttacking || this.player.attackId === this.lastAttackSoundId) {
      return;
    }

    this.lastAttackSoundId = this.player.attackId;
    this.playSound('sfx-sword-slash', 0.36);
  }

  private playSound(key: string, volume: number) {
    if (!this.cache.audio.exists(key)) {
      return;
    }

    this.sound.play(key, { volume });
  }

  private showDamageNumber(x: number, y: number, damage: number) {
    const text = this.add
      .text(x, y, String(damage), {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#fff0a6',
        stroke: '#150d05',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(62);

    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      scale: 1.35,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private showEndScreen(title: string, color: string, footer = 'Press R to restart') {
    this.saveBestScore();
    this.hud?.showEndScreen(title, color, this.score, footer);
  }

  private saveBestScore() {
    const previous = Number.parseInt(window.localStorage.getItem('moonlit-best-score') ?? '0', 10) || 0;

    if (this.score > previous) {
      window.localStorage.setItem('moonlit-best-score', String(this.score));
    }
  }

  private createPlayerHitEffect(direction: 1 | -1) {
    if (!this.player) {
      return;
    }

    const x = this.player.body.x;
    const y = this.player.body.y - 36;

    for (let i = 0; i < 6; i += 1) {
      const spark = this.add.rectangle(x, y, 3, 3, 0xff6b6b, 1).setDepth(61).setScrollFactor(0);

      this.tweens.add({
        targets: spark,
        x: x - direction * Phaser.Math.Between(14, 32),
        y: y + Phaser.Math.Between(-14, 16),
        alpha: 0,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private createFallbackTextures() {
    if (!this.textures.exists('ground-collider')) {
      const ground = this.add.graphics();
      ground.fillStyle(0xffffff, 0);
      ground.fillRect(0, 0, 16, 16);
      ground.generateTexture('ground-collider', 16, 16);
      ground.destroy();
    }

    if (!this.textures.exists('player-body')) {
      const body = this.add.graphics();
      body.fillStyle(0xffffff, 0);
      body.fillRect(0, 0, 26, 52);
      body.generateTexture('player-body', 26, 52);
      body.destroy();
    }
  }
}
