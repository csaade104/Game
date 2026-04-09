import Phaser from 'phaser';
import { PALETTE } from '../utils/ColorPalette';
import { pulse } from '../utils/Easing';

export class TitleScene extends Phaser.Scene {
  private emberParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private uiTime = 0;
  private promptText!: Phaser.GameObjects.Text;
  private started = false;

  constructor() { super('TitleScene'); }

  create() {
    const sw = this.scale.width;
    const sh = this.scale.height;
    const cx = sw / 2;
    const cy = sh / 2;
    const scaleX = sw / 480;
    const scaleY = sh / 270;

    // ── Sky gradient background ───────────────────────────────────────────
    const bg = this.add.graphics();
    // Deep void at top
    bg.fillGradientStyle(0x0a0608, 0x0a0608, 0x1a0d1f, 0x1a0d1f, 1);
    bg.fillRect(0, 0, sw, sh * 0.6);
    // Ember horizon
    bg.fillGradientStyle(0x1a0d1f, 0x1a0d1f, 0x3a1008, 0x3a1008, 1);
    bg.fillRect(0, sh * 0.6, sw, sh * 0.4);

    // ── Silhouette city skyline ───────────────────────────────────────────
    const skyline = this.add.graphics();
    skyline.fillStyle(0x0d0810, 1);
    // Towers and battlements (designed for 480×270, scaled to actual viewport)
    const buildings = [
      [0, 160, 30, 50],
      [25, 155, 20, 45],
      [40, 148, 35, 62],
      [70, 162, 25, 38],
      [90, 145, 40, 55],
      [125, 158, 22, 42],
      [142, 142, 45, 78],  // clocktower
      [180, 160, 28, 40],
      [205, 150, 32, 60],
      [232, 165, 20, 35],
      [248, 148, 38, 52],
      [282, 155, 26, 45],
      [305, 160, 30, 40],
      [330, 145, 42, 65],
      [368, 158, 22, 42],
      [385, 152, 35, 58],
      [415, 160, 28, 40],
      [440, 148, 32, 52],
      [460, 155, 20, 35],
    ];
    for (const [bx, by, bw, bh] of buildings) {
      skyline.fillRect(bx * scaleX, by * scaleY, bw * scaleX, bh * scaleY);
      // battlements
      for (let m = bx; m < bx + bw; m += 5) {
        skyline.fillRect(m * scaleX, (by - 4) * scaleY, 3 * scaleX, 4 * scaleY);
      }
    }

    // ── Ember horizon glow ────────────────────────────────────────────────
    const glow = this.add.graphics();
    for (let i = 0; i < 6; i++) {
      const alpha = (0.06 - i * 0.008);
      const h = 8 + i * 10;
      glow.fillStyle(0xff6b35, alpha);
      glow.fillRect(0, sh - 80 * scaleY + i * 4 * scaleY, sw, h * scaleY);
    }

    // ── Stars ─────────────────────────────────────────────────────────────
    const stars = this.add.graphics();
    stars.fillStyle(0xfff1a8, 0.8);
    for (let i = 0; i < 60; i++) {
      const sx = Phaser.Math.Between(0, sw);
      const sy = Phaser.Math.Between(0, sh * 0.44);
      stars.fillRect(sx, sy, 1, 1);
    }
    // A few brighter stars
    stars.fillStyle(0xffffff, 1);
    for (let i = 0; i < 12; i++) {
      const sx = Phaser.Math.Between(0, sw);
      const sy = Phaser.Math.Between(0, sh * 0.37);
      stars.fillRect(sx, sy, 1, 1);
    }

    // ── Ember particle emitters ───────────────────────────────────────────
    this.emberParticles = this.add.particles(cx, sh - 30, 'particle_ember', {
      speed: { min: 8, max: 25 },
      angle: { min: 250, max: 290 },
      lifespan: { min: 2000, max: 4000 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [PALETTE.EMBER_BRIGHT, PALETTE.EMBER_MID, PALETTE.LANTERN],
      frequency: 60,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
    });

    // ── EMBERHOLD logo ────────────────────────────────────────────────────
    // Outer glow rings
    for (let r = 3; r >= 1; r--) {
      this.add.text(cx + r, cy - 40 + r, 'EMBERHOLD', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#3a1008',
        letterSpacing: 6,
      }).setOrigin(0.5).setAlpha(0.4);
    }
    // Main title
    const title = this.add.text(cx, cy - 40, 'EMBERHOLD', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ff6b35',
      letterSpacing: 6,
    }).setOrigin(0.5);

    // Inner highlight
    this.add.text(cx, cy - 40, 'EMBERHOLD', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffd166',
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0.25);

    // ── Subtitle ──────────────────────────────────────────────────────────
    this.add.text(cx, cy - 12, 'The Last Light Beneath', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#8a6a5a',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // ── Decorative ember divider ───────────────────────────────────────────
    const divider = this.add.graphics();
    divider.lineStyle(1, PALETTE.EMBER_DEEP, 0.6);
    divider.beginPath();
    divider.moveTo(cx - 80, cy - 2);
    divider.lineTo(cx + 80, cy - 2);
    divider.strokePath();
    // Center ember dot
    divider.fillStyle(PALETTE.EMBER_MID, 1);
    divider.fillCircle(cx, cy - 2, 2);

    // ── Press to begin ────────────────────────────────────────────────────
    this.promptText = this.add.text(cx, cy + 28, 'PRESS ANY KEY TO BEGIN', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#e8d5b0',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // ── Version / lore snippet ─────────────────────────────────────────────
    this.add.text(cx, sh - 16, '"The ember fades. The dark remembers."', {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#4a3020',
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.add.text(8, sh - 10, 'v0.1.0', {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#3a2818',
    });

    // ── Title glow animation ───────────────────────────────────────────────
    this.tweens.add({
      targets: title,
      alpha: { from: 0.85, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // ── Fade in ────────────────────────────────────────────────────────────
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // ── Input to start ─────────────────────────────────────────────────────
    const startGame = () => {
      if (this.started) return;
      this.started = true;
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('HubScene');
        this.scene.start('UIScene');
      });
    };

    this.input.keyboard?.once('keydown', startGame);
    this.input.once('pointerdown', startGame);
  }

  update(time: number, delta: number) {
    this.uiTime += delta / 1000;
    // Pulse the prompt text
    this.promptText.setAlpha(0.4 + pulse(this.uiTime, 0.6) * 0.6);
  }
}
