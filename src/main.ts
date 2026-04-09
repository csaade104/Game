import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { HubScene } from './scenes/HubScene';
import { DungeonScene } from './scenes/DungeonScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0a0608',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  parent: 'game-container',
  scene: [BootScene, PreloadScene, TitleScene, HubScene, DungeonScene, UIScene],
  scale: {
    mode: Phaser.Scale.FIT,     // scale to fit screen — no cropping, no black bars on iPhone
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 444,                // 960/444 ≈ 2.16:1 matches iPhone landscape exactly
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
