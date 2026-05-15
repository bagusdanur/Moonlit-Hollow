import Phaser from 'phaser';
import type { LevelConfig } from '../levels/types';

export function loadGameAssets(scene: Phaser.Scene, level: LevelConfig) {
  loadImage(scene, level.backgroundKey, level.backgroundPath);
  loadSpriteSheet(scene, 'player-idle', '/assets/Character/Idle/Idle-Sheet.png', {
    frameWidth: 64,
    frameHeight: 80,
  });
  loadSpriteSheet(scene, 'player-run', '/assets/Character/Run/Run-Sheet.png', {
    frameWidth: 80,
    frameHeight: 80,
  });
  loadSpriteSheet(scene, 'player-jump', '/assets/Character/Jumlp-All/Jump-All-Sheet.png', {
    frameWidth: 64,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'player-attack', '/assets/Character/Attack-01/Attack-01-Sheet.png', {
    frameWidth: 96,
    frameHeight: 80,
  });
  loadSpriteSheet(scene, 'player-dead', '/assets/Character/Dead/Dead-Sheet.png', {
    frameWidth: 80,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'snail-walk', '/assets/Mob/level-1/Snail/walk-Sheet.png', {
    frameWidth: 48,
    frameHeight: 32,
  });
  loadSpriteSheet(scene, 'snail-attack', '/assets/Mob/level-1/Snail/Hide-Sheet.png', {
    frameWidth: 48,
    frameHeight: 32,
  });
  loadSpriteSheet(scene, 'bee-fly', '/assets/Mob/level-1/Small Bee/Fly/Fly-Sheet.png', {
    frameWidth: 64,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'bee-attack', '/assets/Mob/level-1/Small Bee/Attack/Attack-Sheet.png', {
    frameWidth: 64,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'boar-idle', '/assets/Mob/level-1/Boar/Idle/Idle-Sheet.png', {
    frameWidth: 48,
    frameHeight: 32,
  });
  loadSpriteSheet(scene, 'boar-run', '/assets/Mob/level-1/Boar/Run/Run-Sheet.png', {
    frameWidth: 48,
    frameHeight: 32,
  });
  loadSpriteSheet(scene, 'boar-attack', '/assets/Mob/level-1/Boar/Hit-Vanish/Hit-Sheet.png', {
    frameWidth: 48,
    frameHeight: 32,
  });
  loadSpriteSheet(scene, 'alpha-boar-idle', '/assets/Mob/level-1/Boar/Idle/Idle-Sheet-White.png', {
    frameWidth: 48,
    frameHeight: 32,
  });
  loadSpriteSheet(scene, 'alpha-boar-run', '/assets/Mob/level-1/Boar/Run/Run-Sheet-White.png', {
    frameWidth: 48,
    frameHeight: 32,
  });
  loadSpriteSheet(scene, 'alpha-boar-attack', '/assets/Mob/level-1/Boar/Hit-Vanish/Hit-Sheet-White.png', {
    frameWidth: 48,
    frameHeight: 32,
  });
  loadSpriteSheet(scene, 'skeleton-idle', '/assets/Mob/level-2/Skeleton/Skeleton_01_White_Idle.png', {
    frameWidth: 96,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'skeleton-walk', '/assets/Mob/level-2/Skeleton/Skeleton_01_White_Walk.png', {
    frameWidth: 96,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'skeleton-attack', '/assets/Mob/level-2/Skeleton/Skeleton_01_White_Attack1.png', {
    frameWidth: 96,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'skeleton-hurt', '/assets/Mob/level-2/Skeleton/Skeleton_01_White_Hurt.png', {
    frameWidth: 96,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'skeleton-die', '/assets/Mob/level-2/Skeleton/Skeleton_01_White_Die.png', {
    frameWidth: 96,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'bat-idle', '/assets/Mob/level-2/Bat/Bat-IdleFly.png', {
    frameWidth: 64,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'bat-run', '/assets/Mob/level-2/Bat/Bat-Run.png', {
    frameWidth: 64,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'bat-attack', '/assets/Mob/level-2/Bat/Bat-Attack2.png', {
    frameWidth: 64,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'bat-hurt', '/assets/Mob/level-2/Bat/Bat-Hurt.png', {
    frameWidth: 64,
    frameHeight: 64,
  });
  loadSpriteSheet(scene, 'bat-die', '/assets/Mob/level-2/Bat/Bat-Die.png', {
    frameWidth: 64,
    frameHeight: 64,
  });
  loadDeathBringerFrames(scene, 'death-bringer-idle', 'Idle', 8);
  loadDeathBringerFrames(scene, 'death-bringer-walk', 'Walk', 8);
  loadDeathBringerFrames(scene, 'death-bringer-attack', 'Attack', 10);
  loadDeathBringerFrames(scene, 'death-bringer-cast', 'Cast', 9);
  loadDeathBringerFrames(scene, 'death-bringer-spell', 'Spell', 16);
  loadDeathBringerFrames(scene, 'death-bringer-hurt', 'Hurt', 3);
  loadDeathBringerFrames(scene, 'death-bringer-death', 'Death', 10);
  loadAudio(scene, 'sfx-sword-slash', '/sound/sword slash.wav');
  loadAudio(scene, 'sfx-boar-dash', '/sound/boar dash.wav');
}

function loadImage(scene: Phaser.Scene, key: string, path: string) {
  if (!scene.textures.exists(key)) {
    scene.load.image(key, path);
  }
}

function loadSpriteSheet(
  scene: Phaser.Scene,
  key: string,
  path: string,
  config: Phaser.Types.Loader.FileTypes.ImageFrameConfig,
) {
  if (!scene.textures.exists(key)) {
    scene.load.spritesheet(key, path, config);
  }
}

function loadAudio(scene: Phaser.Scene, key: string, path: string) {
  if (!scene.cache.audio.exists(key)) {
    scene.load.audio(key, path);
  }
}

function loadDeathBringerFrames(scene: Phaser.Scene, texturePrefix: string, folder: string, frameCount: number) {
  for (let frame = 1; frame <= frameCount; frame += 1) {
    loadImage(scene, `${texturePrefix}-${frame}`, `/assets/Mob/level-2/Bringer-Of-Death/${folder}/Bringer-of-Death_${folder}_${frame}.png`);
  }
}
