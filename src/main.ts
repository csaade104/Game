import Phaser from 'phaser';
import { GAME_W, GAME_H } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { HubScene } from './scenes/HubScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0a0608',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  parent: 'game-container',
  scene: [BootScene, PreloadScene, TitleScene, HubScene, UIScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
  },
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
  },
  audio: {
    disableWebAudio: false,
  },
};

const game = new Phaser.Game(config);

// Prevent context menu on right-click
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Prevent pull-to-refresh on mobile
document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

export default game;
