import Phaser from 'phaser';
import {
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  ATTACK_ACTIVE_FROM,
  ATTACK_ACTIVE_TO,
  GROUND_Y,
  JUMP_SPEED,
  PLAYER_SPEED,
  WORLD_LEFT,
  WORLD_RIGHT,
} from './config';

type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys;
type PlayerKeys = Record<'W' | 'A' | 'D' | 'J' | 'X' | 'R' | 'ESC', Phaser.Input.Keyboard.Key>;

export class PlayerController {
  readonly body: Phaser.Physics.Arcade.Sprite;
  readonly visual: Phaser.GameObjects.Sprite;

  facing: 1 | -1 = 1;
  isAttacking = false;
  attackId = 0;

  private attackStartedAt = 0;
  private lastAttackAt = -ATTACK_COOLDOWN;
  private skillVisualUntil = 0;
  private hurtControlUntil = 0;
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    platforms: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.scene = scene;
    this.body = scene.physics.add.sprite(130, GROUND_Y, 'player-body');
    this.body.setOrigin(0.5, 1);
    this.body.setVisible(false);
    this.body.setCollideWorldBounds(false);
    this.body.setBounce(0, 0);
    this.body.setMaxVelocity(PLAYER_SPEED, JUMP_SPEED * 1.25);
    this.body.body?.setSize(26, 52);
    this.body.body?.setOffset(0, 0);

    this.visual = scene.add
      .sprite(this.body.x, this.body.y, 'player-idle')
      .setOrigin(0.5, 1)
      .setDepth(10)
      .setScale(1.18);
    this.visual.play('player-idle');

    scene.physics.add.collider(this.body, platforms);
  }

  update(time: number, cursors: CursorKeys, keys: PlayerKeys) {
    const body = this.body.body as Phaser.Physics.Arcade.Body;
    const left = cursors.left.isDown || keys.A.isDown;
    const right = cursors.right.isDown || keys.D.isDown;
    const jump =
      Phaser.Input.Keyboard.JustDown(cursors.space) ||
      Phaser.Input.Keyboard.JustDown(cursors.up) ||
      Phaser.Input.Keyboard.JustDown(keys.W);
    const attack = Phaser.Input.Keyboard.JustDown(keys.J) || Phaser.Input.Keyboard.JustDown(keys.X);

    if (attack && time - this.lastAttackAt >= ATTACK_COOLDOWN) {
      this.isAttacking = true;
      this.attackStartedAt = time;
      this.lastAttackAt = time;
      this.attackId += 1;
      this.play('player-attack');
    }

    if (time - this.attackStartedAt >= ATTACK_DURATION) {
      this.isAttacking = false;
    }

    const canControl = time >= this.hurtControlUntil;

    if (left && canControl) {
      this.facing = -1;
      this.body.setVelocityX(-PLAYER_SPEED);
    } else if (right && canControl) {
      this.facing = 1;
      this.body.setVelocityX(PLAYER_SPEED);
    } else if (canControl) {
      this.body.setVelocityX(0);
    }

    if (jump && body.blocked.down && canControl) {
      this.body.setVelocityY(-JUMP_SPEED);
    }

    this.keepInsideMap();

    if (this.isAttacking || time < this.skillVisualUntil) {
      this.play('player-attack');
    } else if (!body.blocked.down) {
      this.play('player-jump');
    } else if (canControl && (left || right)) {
      this.play('player-run');
    } else {
      this.play('player-idle');
    }

    this.syncVisual();
  }

  syncVisual() {
    this.visual.setPosition(this.body.x, this.body.y).setFlipX(this.facing === -1);
  }

  getAttackCooldownProgress(time: number) {
    return Phaser.Math.Clamp((time - this.lastAttackAt) / ATTACK_COOLDOWN, 0, 1);
  }

  private keepInsideMap() {
    const body = this.body.body as Phaser.Physics.Arcade.Body;
    const x = Phaser.Math.Clamp(this.body.x, WORLD_LEFT, WORLD_RIGHT);

    if (x !== this.body.x) {
      this.body.setX(x);
      body.velocity.x = 0;
    }
  }

  hasActiveAttackHitbox(time: number) {
    const attackAge = time - this.attackStartedAt;

    return (
      this.isAttacking &&
      attackAge >= ATTACK_ACTIVE_FROM &&
      attackAge <= ATTACK_ACTIVE_TO
    );
  }

  hurt(direction: 1 | -1, time = this.scene.time.now) {
    void direction;
    this.visual.setTint(0xff5f5f);
    this.hurtControlUntil = time + 30;
    this.body.setVelocityX(0);
    this.scene.time.delayedCall(150, () => this.visual.clearTint());
  }

  die() {
    this.body.setVelocity(0, 0);
    this.play('player-dead');
  }

  playAttackAnimation() {
    this.skillVisualUntil = this.scene.time.now + ATTACK_DURATION;
    this.play('player-attack');
  }

  private play(key: string) {
    if (this.visual.anims.currentAnim?.key !== key) {
      this.visual.play(key, true);
    }

    this.visual.setFlipX(this.facing === -1);
  }
}
