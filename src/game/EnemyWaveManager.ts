import Phaser from 'phaser';
import { BossPresentation } from './BossPresentation';
import { updateBoarCharge, type BoarChargeState } from './boarBehavior';
import {
  ENEMY_AGGRO_RANGE,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_OFFSCREEN_PADDING,
  ENEMY_SPAWN_DELAY,
  ATTACK_REACH,
  GROUND_Y,
  WORLD_LEFT,
  WORLD_RIGHT,
} from './config';
import type { EnemyKind, EnemySpawn, EnemyStats } from './enemies/types';
import type { LevelConfig } from '../levels/types';
import { PlayerController } from './PlayerController';

type Enemy = {
  kind: EnemyKind;
  sprite: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Graphics;
  hp: number;
  maxHp: number;
  score: number;
  lastAttackAt: number;
  spawnGraceUntil: number;
  stunnedUntil: number;
  attackingUntil: number;
  attackHitAt: number;
  attackResolved: boolean;
  attackDirection: 1 | -1;
  nextSpecialAt: number;
  specialCastingUntil: number;
  lastHitAttackId: number;
  chargeState: BoarChargeState;
  chargeDirection: 1 | -1;
  chargeUntil: number;
  nextChargeAt: number;
  introUntil: number;
  alive: boolean;
  facing: 1 | -1;
  isBoss: boolean;
};

type EnemyWaveCallbacks = {
  onEnemyKilled: (score: number) => void;
  onEnemyDamaged: (x: number, y: number, damage: number) => void;
  onPlayerHit: (direction: 1 | -1, time: number, damage: number) => void;
  onBoarDash: () => void;
  onWaveChanged: (waveIndex: number) => void;
  onWin: () => void;
};

export class EnemyWaveManager {
  private enemies: Enemy[] = [];
  private waveIndex = 0;
  private spawningWave = false;
  private won = false;
  private scene: Phaser.Scene;
  private player: PlayerController;
  private level: LevelConfig;
  private callbacks: EnemyWaveCallbacks;
  private bossPresentation: BossPresentation;

  constructor(
    scene: Phaser.Scene,
    player: PlayerController,
    level: LevelConfig,
    callbacks: EnemyWaveCallbacks,
  ) {
    this.scene = scene;
    this.player = player;
    this.level = level;
    this.callbacks = callbacks;
    this.bossPresentation = new BossPresentation(scene);
  }

  start() {
    this.spawnCurrentWave(0);
  }

  update(time: number, dt: number) {
    if (this.won) {
      return;
    }

    this.enemies.forEach((enemy) => this.updateEnemy(enemy, time, dt));
  }

  attackFromPlayer(attackId: number) {
    const playerX = this.player.body.x;
    const playerY = this.player.body.y;
    const facing = this.player.facing;
    const time = this.scene.time.now;

    this.enemies.forEach((enemy) => {
      if (!enemy.alive || enemy.lastHitAttackId === attackId || time < enemy.introUntil) {
        return;
      }

      const dx = enemy.sprite.x - playerX;
      const dy = Math.abs(enemy.sprite.y - playerY);
      const inFront = facing === 1 ? dx >= -14 : dx <= 14;
      const inRange = Math.abs(dx) <= ATTACK_REACH && dy <= 82;

      if (!inFront || !inRange) {
        return;
      }

      this.damageEnemy(enemy, attackId, 1, facing);
    });
  }

  attackFromSlash(
    x: number,
    y: number,
    width: number,
    height: number,
    hitId: number,
    damage: number,
    direction: 1 | -1,
  ) {
    const slashBounds = new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);
    const time = this.scene.time.now;

    this.enemies.forEach((enemy) => {
      if (!enemy.alive || enemy.lastHitAttackId === hitId || time < enemy.introUntil) {
        return;
      }

      if (!Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, enemy.sprite.getBounds())) {
        return;
      }

      this.damageEnemy(enemy, hitId, damage, direction);
    });
  }

  destroyAll() {
    this.enemies.forEach((enemy) => {
      enemy.hpBar.destroy();
      enemy.sprite.destroy();
    });
    this.enemies = [];
    this.bossPresentation.clear();
  }

  private updateEnemy(enemy: Enemy, time: number, dt: number) {
    if (!enemy.alive) {
      return;
    }

    const stats = this.getEnemyStats(enemy.kind);
    const dx = this.player.body.x - enemy.sprite.x;
    const absDx = Math.abs(dx);
    const direction: 1 | -1 = dx > 0 ? 1 : -1;
    const isOutsideMap = enemy.sprite.x < WORLD_LEFT || enemy.sprite.x > WORLD_RIGHT;
    const shouldChase =
      time >= enemy.spawnGraceUntil && (absDx <= ENEMY_AGGRO_RANGE || isOutsideMap);
    const isStunned = time < enemy.stunnedUntil;
    const isAttacking = time < enemy.attackingUntil;
    const isSpecialCasting = time < enemy.specialCastingUntil;
    const attackRange = stats.attackRange;

    if (time < enemy.introUntil) {
      this.faceEnemy(enemy, direction);

      if (stats.castAnim) {
        this.playEnemy(enemy, stats.castAnim);
      } else {
        this.playEnemy(enemy, stats.idleAnim);
      }

      enemy.sprite.y = GROUND_Y + stats.yOffset;
      this.updateEnemyHpBar(enemy);
      return;
    }

    const boarCharge = updateBoarCharge(
      enemy,
      time,
      dt,
      this.player.body.x,
      !isStunned && !isAttacking && !isSpecialCasting && shouldChase,
      stats,
    );

    if (boarCharge.handled) {
      this.faceEnemy(enemy, boarCharge.direction ?? direction);
      this.playEnemy(enemy, boarCharge.animation ?? stats.runAnim);
      if (boarCharge.sound === 'boar-dash') {
        this.callbacks.onBoarDash();
      }
    } else if (isSpecialCasting) {
      this.faceEnemy(enemy, direction);
      this.playEnemy(enemy, stats.castAnim ?? stats.idleAnim);
    } else if (isAttacking) {
      this.faceEnemy(enemy, direction);
      this.playEnemy(enemy, stats.attackAnim);
      this.resolveEnemyAttack(enemy, time);
    } else if (isStunned && stats.hurtAnim) {
      this.faceEnemy(enemy, direction);
      this.playEnemy(enemy, stats.hurtAnim);
    } else if (!isStunned && shouldChase && this.tryBossSpecial(enemy, time)) {
      this.faceEnemy(enemy, direction);
    } else if (!isStunned && shouldChase && absDx > attackRange) {
      enemy.sprite.x += direction * stats.speed * dt;
      this.faceEnemy(enemy, direction);
      this.playEnemy(enemy, stats.runAnim);
    } else {
      this.faceEnemy(enemy, direction);
      this.playEnemy(enemy, stats.idleAnim);

      if (!isStunned && shouldChase) {
        this.attackPlayer(enemy, time, direction);
      }
    }

    enemy.sprite.y = GROUND_Y + stats.yOffset;
    this.updateEnemyHpBar(enemy);
  }

  private attackPlayer(enemy: Enemy, time: number, direction: 1 | -1) {
    if (time - enemy.lastAttackAt < ENEMY_ATTACK_COOLDOWN) {
      return;
    }

    const stats = this.getEnemyStats(enemy.kind);
    const closeEnough = Math.abs(enemy.sprite.x - this.player.body.x) <= stats.attackRange;
    const sameLevel = Math.abs(enemy.sprite.y - this.player.body.y) <= 92;

    if (!closeEnough || !sameLevel) {
      return;
    }

    enemy.lastAttackAt = time;
    enemy.attackingUntil = time + stats.attackDuration;
    enemy.attackHitAt = time + (stats.attackHitDelay ?? 140);
    enemy.attackResolved = false;
    enemy.attackDirection = direction;
    this.playEnemy(enemy, stats.attackAnim);
    enemy.sprite.setTint(0xffb35c);
    if (enemy.isBoss) {
      this.bossPresentation.createAttackWarning(enemy, direction);
    }
    this.scene.tweens.add({
      targets: enemy.sprite,
      scaleX: enemy.sprite.scaleX * 1.08,
      scaleY: enemy.sprite.scaleY * 1.08,
      duration: 80,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
    this.scene.time.delayedCall(120, () => this.applyBaseTint(enemy));
  }

  private resolveEnemyAttack(enemy: Enemy, time: number) {
    if (enemy.attackResolved || time < enemy.attackHitAt) {
      return;
    }

    const stats = this.getEnemyStats(enemy.kind);
    const closeEnough = Math.abs(enemy.sprite.x - this.player.body.x) <= stats.attackRange;
    const sameLevel = Math.abs(enemy.sprite.y - this.player.body.y) <= 92;

    enemy.attackResolved = true;

    if (!closeEnough || !sameLevel) {
      return;
    }

    this.callbacks.onPlayerHit(enemy.attackDirection, time, stats.damage ?? 1);
  }

  private damageEnemy(enemy: Enemy, hitId: number, damage: number, direction: 1 | -1) {
    enemy.lastHitAttackId = hitId;
    enemy.hp -= damage;
    enemy.stunnedUntil = this.scene.time.now + 260;
    enemy.sprite.setTint(0xffffff);
    this.createHitSpark(enemy.sprite.x, enemy.sprite.y - 28, direction);
    this.callbacks.onEnemyDamaged(enemy.sprite.x, enemy.sprite.y - 48, damage);
    this.scene.time.delayedCall(90, () => this.applyBaseTint(enemy));
    this.updateEnemyHpBar(enemy);

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy) {
    enemy.alive = false;
    enemy.hpBar.destroy();
    this.callbacks.onEnemyKilled(enemy.score);
    enemy.sprite.setTint(0x4a5360);
    const stats = this.getEnemyStats(enemy.kind);

    if (stats.deathAnim) {
      this.playEnemy(enemy, stats.deathAnim);
    }

    this.scene.tweens.add({
      targets: enemy.sprite,
      alpha: 0,
      y: enemy.sprite.y - 18,
      duration: stats.deathAnim ? 520 : 280,
      onComplete: () => {
        enemy.sprite.destroy();
        this.enemies = this.enemies.filter((item) => item !== enemy);
        if (enemy.isBoss) {
          this.bossPresentation.clear();
        }
        this.checkWaveComplete();
      },
    });
  }

  private checkWaveComplete() {
    if (this.spawningWave || this.enemies.some((enemy) => enemy.alive)) {
      return;
    }

    this.waveIndex += 1;

    if (this.waveIndex >= this.level.waves.length) {
      this.won = true;
      this.callbacks.onWin();
      return;
    }

    this.spawnCurrentWave(800);
  }

  private spawnCurrentWave(delay: number) {
    const wave = this.level.waves[this.waveIndex];
    const warningLead = 520;

    if (!wave || this.spawningWave) {
      return;
    }

    this.spawningWave = true;
    this.callbacks.onWaveChanged(this.waveIndex + 1);
    this.scene.time.delayedCall(delay, () => {
      const isBossWave = wave.length === 1 && wave[0].kind === 'deathBringer';

      wave.forEach((spawn, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const x =
          isBossWave
            ? spawn.x
            : side === -1
            ? WORLD_LEFT - ENEMY_OFFSCREEN_PADDING
            : WORLD_RIGHT + ENEMY_OFFSCREEN_PADDING;
        const spawnDelay = isBossWave ? 0 : index * ENEMY_SPAWN_DELAY;

        this.scene.time.delayedCall(spawnDelay, () => {
          if (!isBossWave) {
            this.createSpawnWarning(x, spawn.kind);
          }
        });
        this.scene.time.delayedCall(spawnDelay + (isBossWave ? 0 : warningLead), () => {
          this.spawnEnemy({ ...spawn, x });

          if (index === wave.length - 1) {
            this.spawningWave = false;
          }
        });
      });
    });
  }

  private createSpawnWarning(spawnX: number, kind: EnemyKind) {
    const stats = this.getEnemyStats(kind);
    const x = Phaser.Math.Clamp(spawnX, WORLD_LEFT + 52, WORLD_RIGHT - 52);
    const y = GROUND_Y + stats.yOffset - 20;
    const color = kind === 'bat' ? 0x9fe8ff : 0xf5d77d;
    const glow = this.scene.add.circle(x, y, 26, color, 0.14).setDepth(7);
    const ring = this.scene.add.circle(x, y, 26).setStrokeStyle(3, color, 0.72).setDepth(8);
    const mark = this.scene.add
      .text(x, y - 2, '!', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#05080a',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.scene.tweens.add({
      targets: [glow, ring, mark],
      scale: 1.28,
      alpha: 0.2,
      duration: 500,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        glow.destroy();
        ring.destroy();
        mark.destroy();
      },
    });
  }

  private spawnEnemy(spawn: EnemySpawn) {
    const stats = this.getEnemyStats(spawn.kind);
    const isBoss = this.isBossSpawn(spawn);
    const introDuration = isBoss ? 2100 : 0;
    const now = this.scene.time.now;
    const sprite = this.scene.add
      .sprite(spawn.x, GROUND_Y + stats.yOffset, stats.idleAnim)
      .setOrigin(0.5, 1)
      .setScale(stats.scale)
      .setDepth(9);

    sprite.play(stats.idleAnim);

    const enemy: Enemy = {
      kind: spawn.kind,
      sprite,
      hpBar: this.scene.add.graphics().setDepth(20),
      hp: spawn.hp,
      maxHp: spawn.hp,
      score: spawn.score,
      lastAttackAt: -ENEMY_ATTACK_COOLDOWN,
      spawnGraceUntil: this.scene.time.now + stats.spawnGrace,
      stunnedUntil: 0,
      attackingUntil: 0,
      attackHitAt: 0,
      attackResolved: true,
      attackDirection: -1,
      nextSpecialAt: this.scene.time.now + 2500,
      specialCastingUntil: 0,
      lastHitAttackId: 0,
      chargeState: 'ready',
      chargeDirection: -1,
      chargeUntil: 0,
      nextChargeAt: this.scene.time.now + 900,
      introUntil: now + introDuration,
      alive: true,
      facing: -1,
      isBoss,
    };

    enemy.spawnGraceUntil = now + stats.spawnGrace + introDuration;
    this.applyBaseTint(enemy);
    this.createSpawnBurst(enemy);
    this.enemies.push(enemy);
    this.updateEnemyHpBar(enemy);

    if (isBoss) {
      this.bossPresentation.createArrival(
        enemy,
        stats,
        (key) => this.playEnemy(enemy, key),
        () => this.applyBaseTint(enemy),
      );
    }
  }

  private updateEnemyHpBar(enemy: Enemy) {
    if (!enemy.alive) {
      return;
    }

    if (enemy.isBoss) {
      this.bossPresentation.updateHpBar(enemy);
      return;
    }

    const stats = this.getEnemyStats(enemy.kind);
    const width = 42;
    const fill = Phaser.Math.Clamp((enemy.hp / enemy.maxHp) * width, 0, width);

    enemy.hpBar.clear();
    enemy.hpBar.fillStyle(0x0b1114, 0.9);
    enemy.hpBar.fillRect(enemy.sprite.x - width / 2, enemy.sprite.y - stats.hpBarOffsetY, width, 6);
    enemy.hpBar.fillStyle(0xd24b4b);
    enemy.hpBar.fillRect(enemy.sprite.x - width / 2, enemy.sprite.y - stats.hpBarOffsetY, fill, 6);
  }

  private faceEnemy(enemy: Enemy, direction: 1 | -1) {
    const stats = this.getEnemyStats(enemy.kind);

    enemy.facing = direction;
    enemy.sprite.setFlipX(stats.facesLeftByDefault ? direction > 0 : direction < 0);
  }

  private playEnemy(enemy: Enemy, key: string) {
    if (enemy.sprite.anims.currentAnim?.key !== key) {
      enemy.sprite.play(key, true);
    }
  }

  private applyBaseTint(enemy: Enemy) {
    enemy.sprite.clearTint();
  }

  private createSpawnBurst(enemy: Enemy) {
    if (enemy.kind !== 'alphaBoar' && enemy.kind !== 'deathBringer') {
      return;
    }

    const color = enemy.kind === 'deathBringer' ? 0x8d5cff : 0xff3855;
    const ring = this.scene.add
      .circle(enemy.sprite.x, enemy.sprite.y - 28, 18, color, 0.18)
      .setDepth(8);

    this.scene.tweens.add({
      targets: ring,
      scale: 3.2,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private isBossSpawn(spawn: EnemySpawn) {
    const wave = this.level.waves[this.waveIndex];

    return wave.length === 1 && spawn.kind === 'deathBringer' && this.waveIndex === this.level.waves.length - 1;
  }

  private getEnemyStats(kind: EnemyKind): EnemyStats {
    const stats = this.level.enemyStats[kind];

    if (!stats) {
      throw new Error(`Missing enemy stats for "${kind}" in ${this.level.id}`);
    }

    return stats;
  }

  private tryBossSpecial(enemy: Enemy, time: number) {
    const stats = this.getEnemyStats(enemy.kind);
    const distance = Math.abs(this.player.body.x - enemy.sprite.x);
    const castRange = 280;

    if (!enemy.isBoss || !stats.specialAnim || time < enemy.nextSpecialAt || distance > castRange) {
      return false;
    }

    enemy.nextSpecialAt = time + 3300;
    enemy.specialCastingUntil = time + 780;
    enemy.stunnedUntil = Math.max(enemy.stunnedUntil, time + 780);
    this.playEnemy(enemy, stats.castAnim ?? stats.idleAnim);
    enemy.sprite.setTint(0xd7b4ff);
    this.scene.time.delayedCall(520, () => this.castBossSpell(enemy, stats.specialAnim!));
    this.scene.time.delayedCall(780, () => this.applyBaseTint(enemy));
    return true;
  }

  private castBossSpell(enemy: Enemy, specialAnim: string) {
    if (!enemy.alive) {
      return;
    }

    const playerBody = this.player.body.body as Phaser.Physics.Arcade.Body;
    const predictedX = this.player.body.x + playerBody.velocity.x * 0.3;
    const targetX = Phaser.Math.Clamp(predictedX, WORLD_LEFT + 70, WORLD_RIGHT - 70);
    const targetY = GROUND_Y + 2;
    const warning = this.scene.add
      .circle(targetX, targetY - 8, 58, 0x8e38ff, 0.24)
      .setDepth(7);
    const ring = this.scene.add
      .circle(targetX, targetY - 8, 58)
      .setStrokeStyle(4, 0xf0d8ff, 0.76)
      .setDepth(8);

    this.scene.tweens.add({
      targets: [warning, ring],
      scale: 1.18,
      alpha: 0.1,
      duration: 380,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        warning.destroy();
        ring.destroy();
        this.resolveBossSpell(targetX, targetY, specialAnim);
      },
    });
  }

  private resolveBossSpell(x: number, y: number, specialAnim: string) {
    const spell = this.scene.add
      .sprite(x, y, `${specialAnim}-1`)
      .setOrigin(0.5, 1)
      .setScale(3.5)
      .setDepth(12)
      .play(specialAnim);

    this.scene.cameras.main.shake(110, 0.0022);
    this.scene.time.delayedCall(45, () => {
      const closeEnough = Math.abs(this.player.body.x - x) <= 78;
      const sameLevel = Math.abs(this.player.body.y - y) <= 116;

      if (closeEnough && sameLevel) {
        const direction: 1 | -1 = this.player.body.x < x ? -1 : 1;
        this.callbacks.onPlayerHit(direction, this.scene.time.now, 3.5);
      }
    });
    spell.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spell.destroy());
  }

  private createHitSpark(x: number, y: number, direction: 1 | -1) {
    for (let i = 0; i < 5; i += 1) {
      const spark = this.scene.add
        .rectangle(x, y, 3, 3, 0xfff1a3, 1)
        .setDepth(30)
        .setRotation(Phaser.Math.FloatBetween(-0.7, 0.7));

      this.scene.tweens.add({
        targets: spark,
        x: x + direction * Phaser.Math.Between(16, 34),
        y: y + Phaser.Math.Between(-18, 10),
        alpha: 0,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }
}
