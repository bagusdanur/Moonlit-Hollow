import Phaser from 'phaser';

export function createGameAnimations(scene: Phaser.Scene) {
  createAnimation(scene, 'player-idle', 'player-idle', 0, 3, 6, -1);
  createAnimation(scene, 'player-run', 'player-run', 0, 7, 12, -1);
  createAnimation(scene, 'player-jump', 'player-jump', 0, 14, 16, 0);
  createAnimation(scene, 'player-attack', 'player-attack', 0, 7, 18, 0);
  createAnimation(scene, 'player-dead', 'player-dead', 0, 7, 10, 0);

  createAnimation(scene, 'snail-walk', 'snail-walk', 0, 7, 8, -1);
  createAnimation(scene, 'snail-attack', 'snail-attack', 0, 7, 14, 0);
  createAnimation(scene, 'bee-fly', 'bee-fly', 0, 3, 9, -1);
  createAnimation(scene, 'bee-attack', 'bee-attack', 0, 3, 13, 0);
  createAnimation(scene, 'boar-idle', 'boar-idle', 0, 3, 7, -1);
  createAnimation(scene, 'boar-run', 'boar-run', 0, 5, 14, -1);
  createAnimation(scene, 'boar-attack', 'boar-attack', 0, 3, 15, 0);
  createAnimation(scene, 'alpha-boar-idle', 'alpha-boar-idle', 0, 3, 7, -1);
  createAnimation(scene, 'alpha-boar-run', 'alpha-boar-run', 0, 5, 14, -1);
  createAnimation(scene, 'alpha-boar-attack', 'alpha-boar-attack', 0, 3, 15, 0);

  createAnimation(scene, 'skeleton-idle', 'skeleton-idle', 0, 7, 8, -1);
  createAnimation(scene, 'skeleton-walk', 'skeleton-walk', 0, 9, 12, -1);
  createAnimation(scene, 'skeleton-attack', 'skeleton-attack', 0, 9, 14, 0);
  createAnimation(scene, 'skeleton-hurt', 'skeleton-hurt', 0, 4, 12, 0);
  createAnimation(scene, 'skeleton-die', 'skeleton-die', 0, 12, 12, 0);

  createAnimation(scene, 'bat-idle', 'bat-idle', 0, 8, 11, -1);
  createAnimation(scene, 'bat-run', 'bat-run', 0, 7, 13, -1);
  createAnimation(scene, 'bat-attack', 'bat-attack', 0, 10, 15, 0);
  createAnimation(scene, 'bat-hurt', 'bat-hurt', 0, 4, 13, 0);
  createAnimation(scene, 'bat-die', 'bat-die', 0, 11, 13, 0);

  createImageSequenceAnimation(scene, 'death-bringer-idle', 'death-bringer-idle', 8, 8, -1);
  createImageSequenceAnimation(scene, 'death-bringer-walk', 'death-bringer-walk', 8, 10, -1);
  createImageSequenceAnimation(scene, 'death-bringer-attack', 'death-bringer-attack', 10, 14, 0);
  createImageSequenceAnimation(scene, 'death-bringer-cast', 'death-bringer-cast', 9, 11, -1);
  createImageSequenceAnimation(scene, 'death-bringer-spell', 'death-bringer-spell', 16, 16, 0);
  createImageSequenceAnimation(scene, 'death-bringer-hurt', 'death-bringer-hurt', 3, 11, 0);
  createImageSequenceAnimation(scene, 'death-bringer-death', 'death-bringer-death', 10, 10, 0);
}

function createAnimation(
  scene: Phaser.Scene,
  key: string,
  texture: string,
  start: number,
  end: number,
  frameRate: number,
  repeat: number,
) {
  if (scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(texture, { start, end }),
    frameRate,
    repeat,
  });
}

function createImageSequenceAnimation(
  scene: Phaser.Scene,
  key: string,
  texturePrefix: string,
  frameCount: number,
  frameRate: number,
  repeat: number,
) {
  if (scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: Array.from({ length: frameCount }, (_item, index) => ({
      key: `${texturePrefix}-${index + 1}`,
    })),
    frameRate,
    repeat,
  });
}
