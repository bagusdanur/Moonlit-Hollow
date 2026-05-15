import Phaser from 'phaser';
import { BossPresentation } from './BossPresentation';
import { updateBoarCharge } from './boarBehavior';
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
import type { RuntimeEnemy } from './enemies/runtimeTypes';
import {
  createDefeatBurst,
  createHitImpact,
  createHitSpark,
  createSpawnBurst,
  createSpawnWarning,
} from './enemies/enemyEffects';
import { tryBossSpecial } from './enemies/bossSpell';
import { EnemyDebugView } from './enemies/enemyDebug';
import type { LevelConfig } from '../levels/types';
import { PlayerController } from './PlayerController';

type EnemyWaveCallbacks = {
  onEnemyKilled: (score: number) => void;
  onEnemyDamaged: (x: number, y: number, damage: number) => void;
  onPlayerHit: (direction: 1 | -1, time: number, damage: number) => void;
  onBoarDash: () => void;
  onWaveChanged: (waveIndex: number) => void;
  onWin: () => void;
};

export class EnemyWaveManager {
  private enemies: RuntimeEnemy[] = [];
  private waveIndex = 0;
  private spawningWave = false;
  private won = false;
  private scene: Phaser.Scene;
  private player: PlayerController;
  private level: LevelConfig;
  private callbacks: EnemyWaveCallbacks;
  private bossPresentation: BossPresentation;
  private debugView: EnemyDebugView;

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
    this.debugView = new EnemyDebugView(scene);
  }

  start() {
    this.spawnCurrentWave(0);
  }

  update(time: number, dt: number) {
    if (this.won) {
      return;
    }

    this.enemies.forEach((enemy) => this.updateEnemy(enemy, time, dt));
    this.debugView.draw(this.enemies, (enemy) => this.getEnemyStats(enemy.kind));
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
      const inRange = Math.abs(dx) <= ATTACK_REACH && dy <= 74;

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
    this.debugView.destroy();
  }

  setDebugEnabled(enabled: boolean) {
    this.debugView.setEnabled(enabled);
  }

  private updateEnemy(enemy: RuntimeEnemy, time: number, dt: number) {
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
      this.updateAttackLunge(enemy, time, stats);
      this.resolveEnemyAttack(enemy, time);
    } else if (isStunned && stats.hurtAnim) {
      this.faceEnemy(enemy, direction);
      this.playEnemy(enemy, stats.hurtAnim);
    } else if (
      !isStunned &&
      shouldChase &&
      tryBossSpecial({
        scene: this.scene,
        enemy,
        stats,
        player: this.player,
        time,
        playEnemy: (target, key) => this.playEnemy(target, key),
        clearTint: (target) => this.applyBaseTint(target),
        onPlayerHit: this.callbacks.onPlayerHit,
      })
    ) {
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

    if (!((enemy.kind === 'bat' || enemy.kind === 'bee') && isAttacking)) {
      enemy.sprite.y = GROUND_Y + stats.yOffset;
    }
    this.updateEnemyHpBar(enemy);
  }

  private attackPlayer(enemy: RuntimeEnemy, time: number, direction: 1 | -1) {
    if (time - enemy.lastAttackAt < ENEMY_ATTACK_COOLDOWN) {
      return;
    }

    const stats = this.getEnemyStats(enemy.kind);
    const closeEnough = Math.abs(enemy.sprite.x - this.player.body.x) <= stats.attackRange;
    const sameLevel = Math.abs(enemy.sprite.y - this.player.body.y) <= (stats.attackHeight ?? 92);

    if (!closeEnough || !sameLevel) {
      return;
    }

    enemy.lastAttackAt = time;
    enemy.attackStartedAt = time;
    enemy.attackStartX = enemy.sprite.x;
    enemy.attackStartY = enemy.sprite.y;
    enemy.attackTargetX = this.player.body.x - direction * 18;
    enemy.attackTargetY = this.player.body.y - 34;
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

  private resolveEnemyAttack(enemy: RuntimeEnemy, time: number) {
    if (enemy.attackResolved || time < enemy.attackHitAt) {
      return;
    }

    const stats = this.getEnemyStats(enemy.kind);
    const closeEnough = Math.abs(enemy.sprite.x - this.player.body.x) <= stats.attackRange;
    const sameLevel = Math.abs(enemy.sprite.y - this.player.body.y) <= (stats.attackHeight ?? 92);

    enemy.attackResolved = true;

    if (!closeEnough || !sameLevel) {
      return;
    }

    this.callbacks.onPlayerHit(enemy.attackDirection, time, stats.damage ?? 1);
  }

  private updateAttackLunge(enemy: RuntimeEnemy, time: number, stats: EnemyStats) {
    if (enemy.kind !== 'bat' && enemy.kind !== 'bee') {
      return;
    }

    const progress = Phaser.Math.Clamp((time - enemy.attackStartedAt) / stats.attackDuration, 0, 1);
    const lunge = Math.sin(progress * Math.PI);

    enemy.sprite.x = Phaser.Math.Linear(enemy.attackStartX, enemy.attackTargetX, lunge);
    enemy.sprite.y = Phaser.Math.Linear(enemy.attackStartY, enemy.attackTargetY, lunge);
  }

  private damageEnemy(enemy: RuntimeEnemy, hitId: number, damage: number, direction: 1 | -1) {
    enemy.lastHitAttackId = hitId;
    enemy.hp -= damage;
    if (damage > 1) {
      enemy.stunnedUntil = this.scene.time.now + 220;
    }
    enemy.sprite.setTint(0xffffff);
    this.scene.cameras.main.shake(55, enemy.isBoss ? 0.0018 : 0.001);
    createHitSpark(this.scene, enemy.sprite.x, enemy.sprite.y - 28, direction);
    createHitImpact(this.scene, enemy.sprite.x, enemy.sprite.y - 34, enemy.isBoss);
    this.callbacks.onEnemyDamaged(enemy.sprite.x, enemy.sprite.y - 48, damage);
    this.scene.tweens.add({
      targets: enemy.sprite,
      scaleX: enemy.sprite.scaleX * 1.04,
      scaleY: enemy.sprite.scaleY * 1.04,
      duration: 60,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
    this.scene.time.delayedCall(90, () => this.applyBaseTint(enemy));
    this.updateEnemyHpBar(enemy);

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: RuntimeEnemy) {
    enemy.alive = false;
    enemy.hpBar.destroy();
    this.callbacks.onEnemyKilled(enemy.score);
    enemy.sprite.setTint(0x4a5360);
    createDefeatBurst(this.scene, enemy.sprite.x, enemy.sprite.y - 36, enemy.isBoss);
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

      if (isBossWave) {
        this.bossPresentation.createBossWarning('Bringer of Death');
      }

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
            createSpawnWarning(this.scene, x, spawn.kind, this.getEnemyStats(spawn.kind));
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

    const enemy: RuntimeEnemy = {
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
      attackStartedAt: 0,
      attackStartX: 0,
      attackStartY: 0,
      attackTargetX: 0,
      attackTargetY: 0,
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
    createSpawnBurst(this.scene, enemy);
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

  private updateEnemyHpBar(enemy: RuntimeEnemy) {
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

  private faceEnemy(enemy: RuntimeEnemy, direction: 1 | -1) {
    const stats = this.getEnemyStats(enemy.kind);

    enemy.facing = direction;
    enemy.sprite.setFlipX(stats.facesLeftByDefault ? direction > 0 : direction < 0);
  }

  private playEnemy(enemy: RuntimeEnemy, key: string) {
    if (enemy.sprite.anims.currentAnim?.key !== key) {
      enemy.sprite.play(key, true);
    }
  }

  private applyBaseTint(enemy: RuntimeEnemy) {
    enemy.sprite.clearTint();
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

}
