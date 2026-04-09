import Phaser from 'phaser';
import { GAME_W, GAME_H } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { HubScene } from './scenes/HubScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0a0608',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  parent: 'game-container',
  scene: [BootScene, PreloadScene, TitleScene, HubScene, UIScene],
  scale: {
    mode: Phaser.Scale.EXPAND,   // fills screen edge-to-edge, no black bars
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
  },
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
  },
};

const game = new Phaser.Game(config);

// Prevent context menu and pull-to-refresh
window.addEventListener('contextmenu', e => e.preventDefault());
document.body.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

export default game;
