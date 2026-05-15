import Phaser from 'phaser';
import './style.css';
import { GameScene } from './scenes/GameScene';
import { LevelSelect } from './scenes/LevelSelect';
import { LoadingScene } from './scenes/LoadingScene';
import { MainMenu } from './scenes/MainMenu';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 540,
  backgroundColor: '#172f35',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1200, x: 0 },
      debug: true,
    },
  },
  input: {
    activePointers: 4,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainMenu, LevelSelect, LoadingScene, GameScene],
};

new Phaser.Game(config);
