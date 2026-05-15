import Phaser from 'phaser';

export function toggleFullscreen(scene: Phaser.Scene) {
  if (scene.scale.isFullscreen) {
    scene.scale.stopFullscreen();
    return;
  }

  scene.scale.startFullscreen();
  scene.time.delayedCall(120, () => {
    const orientation = screen.orientation;

    if (!orientation || !('lock' in orientation)) {
      return;
    }

    orientation.lock('landscape').catch(() => {
      // Some mobile browsers allow fullscreen but reject orientation lock.
    });
  });
}
