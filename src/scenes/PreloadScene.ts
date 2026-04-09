import Phaser from 'phaser';
import { PALETTE } from '../utils/ColorPalette';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }

  preload() {
    // Loading bar background
    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1010, 1);
    barBg.fillRect(
      this.cameras.main.centerX - 100,
      this.cameras.main.centerY + 20,
      200, 10
    );
    barBg.lineStyle(1, PALETTE.EMBER_MID, 0.5);
    barBg.strokeRect(
      this.cameras.main.centerX - 100,
      this.cameras.main.centerY + 20,
      200, 10
    );

    // Fill bar
    const bar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(PALETTE.EMBER_MID, 1);
      bar.fillRect(
        this.cameras.main.centerX - 98,
        this.cameras.main.centerY + 22,
        196 * value, 6
      );
      bar.fillStyle(PALETTE.EMBER_BRIGHT, 1);
      bar.fillRect(
        this.cameras.main.centerX - 98,
        this.cameras.main.centerY + 22,
        196 * value, 2
      );
    });

    // Title text
    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'KINDLING THE EMBER...',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ff6b35',
        letterSpacing: 3,
      }
    ).setOrigin(0.5);
  }

  create() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TitleScene');
    });
  }
}
