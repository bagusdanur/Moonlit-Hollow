import Phaser from 'phaser';
import { createGameAnimations } from '../game/animations';
import { loadGameAssets } from '../game/assets';
import {
  GROUND_Y,
  HURT_COOLDOWN,
  PLAYER_MAX_HP,
  ATTACK_REACH,
  WORLD_HEIGHT,
  WORLD_LEFT,
  WORLD_WIDTH,
} from '../game/config';
import { EnemyWaveManager } from '../game/EnemyWaveManager';
import { toggleFullscreen } from '../game/fullscreen';
import { GameHud } from '../game/GameHud';
import { PlayerController, type TouchPlayerInput } from '../game/PlayerController';
import { SlashSkill } from '../game/SlashSkill';
import { getLevelById, LEVELS } from '../levels';
import { completeLevel } from '../levels/progress';
import type { LevelConfig } from '../levels/types';

type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys;
type GameKeys = Record<'W' | 'A' | 'D' | 'J' | 'K' | 'X' | 'R' | 'ESC' | 'SHIFT' | 'H', Phaser.Input.Keyboard.Key>;
type TouchAction = 'left' | 'right' | 'jump' | 'attack' | 'dash' | 'skill' | 'pause' | 'restart' | 'fullscreen';
type TouchButtonStyle = 'action' | 'utility';

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
  private touchInput: TouchPlayerInput = {
    left: false,
    right: false,
    jumpPressed: false,
    attackPressed: false,
    dashPressed: false,
  };
  private touchSkillPressed = false;
  private movementPointers: Partial<Record<'left' | 'right', number>> = {};
  private showTouchControls = false;
  private debugHitboxes = false;
  private debugGraphics?: Phaser.GameObjects.Graphics;

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
    this.keys = this.input.keyboard?.addKeys('W,A,D,J,K,X,R,ESC,SHIFT,H') as GameKeys;
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
    this.createTouchControls();
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

    if (Phaser.Input.Keyboard.JustDown(this.keys.H)) {
      this.toggleDebugHitboxes();
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

    this.player.update(time, this.cursors, this.keys, this.touchInput);
    if ((Phaser.Input.Keyboard.JustDown(this.keys.K) || this.touchSkillPressed) && this.isSlashSkillUnlocked()) {
      this.slashSkill?.tryCast(time);
    }
    this.consumeTouchPresses();
    this.playAttackSound();

    if (this.player.hasActiveAttackHitbox(time)) {
      this.enemies.attackFromPlayer(this.player.attackId);
    }

    this.enemies.update(time, delta / 1000);
    this.drawDebugHitboxes(time);
    this.slashSkill?.update(delta / 1000);
    this.updateAttackCooldown(time);
    this.updateDashCooldown(time);
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
      showKeyboardHints: !this.showTouchControls,
    });
    this.hud.create();
    this.updateHud();
  }

  private damagePlayer(direction: 1 | -1, time: number, damage = 1) {
    if (!this.player || this.player.isInvulnerable(time) || time - this.lastHurtAt < HURT_COOLDOWN) {
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
      this.showEndScreen('YOU DIED', '#ffdfdf', 'Tap RETRY or press R');
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
    this.showEndScreen('VICTORY', '#d9ffcc', 'Level complete');
  }

  private updateHud() {
    this.hud?.updateStats(this.hp, this.score);
  }

  private resetState() {
    this.showTouchControls = !this.sys.game.device.os.desktop;
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
    this.resetTouchInput();
    this.debugHitboxes = false;
    this.debugGraphics?.destroy();
    this.debugGraphics = undefined;
  }

  private createTouchControls() {
    if (!this.showTouchControls) {
      return;
    }

    const controls: Phaser.GameObjects.GameObject[] = [];

    controls.push(this.createMovePad(134, 456));
    controls.push(this.createTouchButton(742, 486, 78, 78, 'JUMP', 'jump', 'action'));
    controls.push(this.createTouchButton(846, 446, 112, 112, 'ATK', 'attack', 'action'));
    controls.push(this.createTouchButton(754, 390, 72, 72, 'DASH', 'dash', 'action'));

    if (this.isSlashSkillUnlocked()) {
      controls.push(this.createTouchButton(842, 346, 72, 72, 'SKL', 'skill', 'action'));
    }

    controls.push(this.createTouchButton(778, 34, 58, 40, 'FULL', 'fullscreen', 'utility'));
    controls.push(this.createTouchButton(850, 34, 48, 40, 'II', 'pause', 'utility'));
    controls.push(this.createTouchButton(916, 34, 48, 40, 'R', 'restart', 'utility'));

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.releaseTouchPointer(pointer.id));
    this.input.on('gameout', () => this.resetTouchInput());

    this.add.container(0, 0, controls).setDepth(70).setScrollFactor(0);
  }

  private createMovePad(x: number, y: number) {
    const width = 202;
    const height = 92;
    const base = this.add.graphics();
    const leftHighlight = this.add.graphics().setVisible(false);
    const rightHighlight = this.add.graphics().setVisible(false);

    this.drawTouchButton(base, width, height, 0x071821, 0.42, 0xdff4ff, 0.5, false, 22);
    this.drawMovePadHighlight(leftHighlight, -width / 4, height);
    this.drawMovePadHighlight(rightHighlight, width / 4, height);

    const divider = this.add.rectangle(0, 0, 2, 48, 0xdff4ff, 0.2);
    const leftText = this.add
      .text(-50, 0, '<', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#f3fbff',
        stroke: '#020709',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    const rightText = this.add
      .text(50, 0, '>', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#f3fbff',
        stroke: '#020709',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    const leftZone = this.add
      .zone(-width / 4, 0, width / 2 + 20, height + 28)
      .setInteractive({ useHandCursor: true });
    const rightZone = this.add
      .zone(width / 4, 0, width / 2 + 20, height + 28)
      .setInteractive({ useHandCursor: true });
    const pad = this.add
      .container(x, y, [base, leftHighlight, rightHighlight, divider, leftText, rightText, leftZone, rightZone])
      .setScrollFactor(0)
      .setAlpha(0.82);

    const press = (action: 'left' | 'right', pointer: Phaser.Input.Pointer) => {
      this.pressTouchAction(action, pointer.id);
      leftHighlight.setVisible(action === 'left');
      rightHighlight.setVisible(action === 'right');
      pad.setAlpha(1);
    };
    const release = (action: 'left' | 'right', pointer: Phaser.Input.Pointer) => {
      this.releaseTouchAction(action, pointer.id);
      leftHighlight.setVisible(false);
      rightHighlight.setVisible(false);
      pad.setAlpha(0.82);
    };

    leftZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => press('left', pointer));
    rightZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => press('right', pointer));
    leftZone.on('pointerup', (pointer: Phaser.Input.Pointer) => release('left', pointer));
    rightZone.on('pointerup', (pointer: Phaser.Input.Pointer) => release('right', pointer));
    leftZone.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => release('left', pointer));
    rightZone.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => release('right', pointer));

    return pad;
  }

  private createTouchButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    action: TouchAction,
    style: TouchButtonStyle,
  ) {
    const isCircle = style === 'action';
    const color = style === 'action' ? 0x10323a : 0x071115;
    const stroke = style === 'action' ? 0x9df7ff : 0xdff4ff;
    const alpha = style === 'utility' ? 0.64 : 0.52;
    const hitWidth = width + (style === 'utility' ? 14 : 24);
    const hitHeight = height + (style === 'utility' ? 14 : 24);
    const panel = this.add.graphics();

    this.drawTouchButton(panel, width, height, color, alpha, stroke, 0.68, isCircle);
    panel.setInteractive(
      isCircle
        ? new Phaser.Geom.Circle(0, 0, Math.max(hitWidth, hitHeight) / 2)
        : new Phaser.Geom.Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight),
      isCircle ? Phaser.Geom.Circle.Contains : Phaser.Geom.Rectangle.Contains,
    );

    const shine = this.add.graphics();
    this.drawTouchButton(shine, width - 12, height - 12, 0xffffff, 0.06, 0xffffff, 0.16, isCircle);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: style === 'utility' ? '12px' : label.length > 1 ? '14px' : '34px',
        color: '#f3fbff',
        stroke: '#020709',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    const button = this.add.container(x, y, [panel, shine, text]).setScrollFactor(0).setAlpha(0.88);
    const release = (pointer: Phaser.Input.Pointer) => this.releaseTouchAction(action, pointer.id);

    panel.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.pressTouchAction(action, pointer.id);
      panel.clear();
      this.drawTouchButton(panel, width, height, 0xbff4ff, 0.34, 0xffffff, 0.88, isCircle);
      button.setScale(0.96);
      button.setAlpha(1);
    });
    panel.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      release(pointer);
      panel.clear();
      this.drawTouchButton(panel, width, height, color, alpha, stroke, 0.68, isCircle);
      button.setScale(1);
      button.setAlpha(0.88);
    });
    panel.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      release(pointer);
      panel.clear();
      this.drawTouchButton(panel, width, height, color, alpha, stroke, 0.68, isCircle);
      button.setScale(1);
      button.setAlpha(0.88);
    });
    panel.on('pointerout', () => {
      panel.clear();
      this.drawTouchButton(panel, width, height, color, alpha, stroke, 0.68, isCircle);
      button.setScale(1);
      button.setAlpha(0.88);
    });

    return button;
  }

  private drawTouchButton(
    target: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    fill: number,
    fillAlpha: number,
    stroke: number,
    strokeAlpha: number,
    isCircle: boolean,
    radius = 14,
  ) {
    target.fillStyle(fill, fillAlpha);
    target.lineStyle(2, stroke, strokeAlpha);

    if (isCircle) {
      const radius = Math.min(width, height) / 2;
      target.fillCircle(0, 0, radius);
      target.strokeCircle(0, 0, radius);
      return;
    }

    target.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    target.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  }

  private drawMovePadHighlight(target: Phaser.GameObjects.Graphics, x: number, height: number) {
    target.fillStyle(0xbff4ff, 0.18);
    target.lineStyle(2, 0xffffff, 0.38);
    target.fillRoundedRect(x - 43, -height / 2 + 7, 86, height - 14, 18);
    target.strokeRoundedRect(x - 43, -height / 2 + 7, 86, height - 14, 18);
  }

  private pressTouchAction(action: TouchAction, pointerId: number) {
    if (action === 'left') {
      this.touchInput.left = true;
      this.touchInput.right = false;
      this.movementPointers.left = pointerId;
      this.movementPointers.right = undefined;
      return;
    }

    if (action === 'right') {
      this.touchInput.right = true;
      this.touchInput.left = false;
      this.movementPointers.right = pointerId;
      this.movementPointers.left = undefined;
      return;
    }

    if (action === 'jump') {
      this.touchInput.jumpPressed = true;
      return;
    }

    if (action === 'attack') {
      this.touchInput.attackPressed = true;
      return;
    }

    if (action === 'dash') {
      this.touchInput.dashPressed = true;
      return;
    }

    if (action === 'skill') {
      this.touchSkillPressed = true;
      return;
    }

    if (action === 'pause') {
      this.togglePause();
      return;
    }

    if (action === 'restart') {
      this.scene.restart();
      return;
    }

    if (action === 'fullscreen') {
      toggleFullscreen(this);
    }
  }

  private releaseTouchAction(action: TouchAction, pointerId: number) {
    if (action === 'left' && this.movementPointers.left === pointerId) {
      this.touchInput.left = false;
      this.movementPointers.left = undefined;
    }

    if (action === 'right' && this.movementPointers.right === pointerId) {
      this.touchInput.right = false;
      this.movementPointers.right = undefined;
    }
  }

  private releaseTouchPointer(pointerId: number) {
    if (this.movementPointers.left === pointerId) {
      this.touchInput.left = false;
      this.movementPointers.left = undefined;
    }

    if (this.movementPointers.right === pointerId) {
      this.touchInput.right = false;
      this.movementPointers.right = undefined;
    }
  }

  private consumeTouchPresses() {
    this.touchInput.jumpPressed = false;
    this.touchInput.attackPressed = false;
    this.touchInput.dashPressed = false;
    this.touchSkillPressed = false;
  }

  private resetTouchInput() {
    this.touchInput = {
      left: false,
      right: false,
      jumpPressed: false,
      attackPressed: false,
      dashPressed: false,
    };
    this.touchSkillPressed = false;
    this.movementPointers = {};
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

  private updateDashCooldown(time: number) {
    this.hud?.updateDashCooldown(this.player?.getDashCooldownProgress(time) ?? 0);
  }

  private updateSlashCooldown(time: number) {
    this.hud?.updateSlashCooldown(this.slashSkill?.getCooldownProgress(time) ?? 0);
  }

  private toggleDebugHitboxes() {
    this.debugHitboxes = !this.debugHitboxes;
    this.enemies?.setDebugEnabled(this.debugHitboxes);

    if (!this.debugHitboxes) {
      this.debugGraphics?.clear();
    }
  }

  private drawDebugHitboxes(time: number) {
    if (!this.debugHitboxes || !this.player) {
      return;
    }

    if (!this.debugGraphics) {
      this.debugGraphics = this.add.graphics().setDepth(96);
    }

    const x = this.player.body.x;
    const y = this.player.body.y - 62;
    const direction = this.player.facing;
    const active = this.player.hasActiveAttackHitbox(time);

    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(2, active ? 0x72ff9f : 0xffdf6e, 0.88);
    this.debugGraphics.fillStyle(active ? 0x72ff9f : 0xffdf6e, 0.12);
    this.debugGraphics.fillRect(direction === 1 ? x : x - ATTACK_REACH, y - 37, ATTACK_REACH, 74);
    this.debugGraphics.strokeRect(direction === 1 ? x : x - ATTACK_REACH, y - 37, ATTACK_REACH, 74);
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
    const showRetry = title !== 'VICTORY';
    const nextLevel = this.getNextLevelId();

    this.hud?.showEndScreen(
      title,
      color,
      this.score,
      footer,
      title === 'VICTORY' && this.level.id === 'level-1-forest' ? 'New skill unlocked: Moon Slash' : '',
      showRetry
        ? [
            { label: 'RETRY', primary: true, onClick: () => this.scene.restart() },
            { label: 'MENU', onClick: () => this.scene.start('MainMenu') },
          ]
        : [
            ...(nextLevel
              ? [{ label: 'CONTINUE', primary: true, onClick: () => this.scene.start('LoadingScene', { levelId: nextLevel }) }]
              : []),
            { label: 'LEVELS', primary: !nextLevel, onClick: () => this.scene.start('LevelSelect') },
            { label: 'MENU', onClick: () => this.scene.start('MainMenu') },
          ],
    );
  }

  private getNextLevelId() {
    const currentIndex = LEVELS.findIndex((level) => level.id === this.level.id);

    return currentIndex >= 0 ? LEVELS[currentIndex + 1]?.id : undefined;
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
