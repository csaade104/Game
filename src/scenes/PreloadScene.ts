import Phaser from 'phaser';
import { PALETTE } from '../utils/ColorPalette';

const TARGET_H = 40; // All character sprites scaled to this height

interface SheetConfig {
  key: string;
  fileKey: string;
  fw: number; // source frame width
  fh: number; // source frame height
}

// NPC sprites (2 frames: idle + walk)
const NPC_SHEETS: SheetConfig[] = [
  { key: 'npc_baelor',    fileKey: 'src_halberd',  fw: 24, fh: 24 },
  { key: 'npc_elara',     fileKey: 'src_mage',     fw: 44, fh: 32 },
  { key: 'npc_mira',      fileKey: 'src_shield',   fw: 24, fh: 28 },
  { key: 'npc_orin',      fileKey: 'src_king',     fw: 40, fh: 28 },
  { key: 'npc_theo',      fileKey: 'src_prince',   fw: 24, fh: 24 },
  { key: 'npc_vesna',     fileKey: 'src_archmage', fw: 44, fh: 36 },
  { key: 'npc_cael',      fileKey: 'src_sword',    fw: 24, fh: 24 },
  { key: 'npc_joren',     fileKey: 'src_cavalier', fw: 32, fh: 28 },
  // Merchant — mounted wanderer
  { key: 'npc_merchant',  fileKey: 'src_horse',    fw: 32, fh: 28 },
];

// Enemy sprites (3 frames: idle, walk, attack — attack reuses walk for Minifolks)
const ENEMY_SHEETS: SheetConfig[] = [
  { key: 'enemy_archer',   fileKey: 'src_archer',   fw: 44, fh: 28 },
  { key: 'enemy_spearman', fileKey: 'src_spear',    fw: 28, fh: 24 },
];

export class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }

  preload() {
    // ── Loading UI ─────────────────────────────────────────────────────────────
    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1010, 1);
    barBg.fillRect(this.cameras.main.centerX - 100, this.cameras.main.centerY + 20, 200, 10);
    barBg.lineStyle(1, PALETTE.EMBER_MID, 0.5);
    barBg.strokeRect(this.cameras.main.centerX - 100, this.cameras.main.centerY + 20, 200, 10);

    const bar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(PALETTE.EMBER_MID, 1);
      bar.fillRect(this.cameras.main.centerX - 98, this.cameras.main.centerY + 22, 196 * value, 6);
      bar.fillStyle(PALETTE.EMBER_BRIGHT, 1);
      bar.fillRect(this.cameras.main.centerX - 98, this.cameras.main.centerY + 22, 196 * value, 2);
    });
    this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'KINDLING THE EMBER...', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ff6b35', letterSpacing: 3,
    }).setOrigin(0.5);

    // ── NPC Sprite Sheets ──────────────────────────────────────────────────────
    this.load.image('src_halberd',  'assets/MinifolksHumans/Outline/MiniHalberdMan.png');
    this.load.image('src_mage',     'assets/MinifolksHumans/Outline/MiniMage.png');
    this.load.image('src_shield',   'assets/MinifolksHumans/Outline/MiniShieldMan.png');
    this.load.image('src_king',     'assets/MinifolksHumans/Outline/MiniKingMan.png');
    this.load.image('src_prince',   'assets/MinifolksHumans/Outline/MiniPrinceMan.png');
    this.load.image('src_archmage', 'assets/MinifolksHumans/Outline/MiniArchMage.png');
    this.load.image('src_sword',    'assets/MinifolksHumans/Outline/MiniSwordMan.png');
    this.load.image('src_cavalier', 'assets/MinifolksHumans/Outline/MiniCavalierMan.png');
    this.load.image('src_horse',    'assets/MinifolksHumans/Outline/MiniHorseMan.png');

    // ── Enemy Sprite Sheets ────────────────────────────────────────────────────
    this.load.image('src_archer',   'assets/MinifolksHumans/Outline/MiniArcherMan.png');
    this.load.image('src_spear',    'assets/MinifolksHumans/Outline/MiniSpearMan.png');

    // ── Combat VFX ────────────────────────────────────────────────────────────
    this.load.image('src_proj',     'assets/MinifolksHumans/HumansProjectiles.png');
  }

  create() {
    this.extractSprites(NPC_SHEETS, 2);   // 2 frames for NPCs
    this.extractSprites(ENEMY_SHEETS, 3); // 3 frames for enemies (frame 2 = attack = walk)
    this.extractProjectileVFX();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TitleScene');
    });
  }

  // ── Extract N animation frames per sprite, scaled to TARGET_H ─────────────
  private extractSprites(configs: SheetConfig[], frames: number) {
    for (const cfg of configs) {
      const srcImg = this.textures.get(cfg.fileKey).getSourceImage() as HTMLImageElement;

      const scale = TARGET_H / cfg.fh;
      const dw = Math.round(cfg.fw * scale);
      const dh = TARGET_H;

      // Canvas width covers all frames
      const ct = this.textures.createCanvas(cfg.key, dw * frames, dh);
      const el = ct!.getSourceImage() as HTMLCanvasElement;
      const ctx = el.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      // Frame 0: idle (col 0, row 0)
      ctx.drawImage(srcImg, 0, 0, cfg.fw, cfg.fh, 0, 0, dw, dh);
      // Frame 1: walk (col 1, row 0)
      ctx.drawImage(srcImg, cfg.fw, 0, cfg.fw, cfg.fh, dw, 0, dw, dh);
      if (frames >= 3) {
        // Frame 2: attack (col 2, row 0 — or reuse col 1 if sheet doesn't have it)
        ctx.drawImage(srcImg, cfg.fw * 2, 0, cfg.fw, cfg.fh, dw * 2, 0, dw, dh);
      }

      ct!.refresh();

      const tex = this.textures.get(cfg.key);
      tex.add('0', 0, 0,       0, dw, dh);
      tex.add('1', 0, dw,      0, dw, dh);
      if (frames >= 3) tex.add('2', 0, dw * 2, 0, dw, dh);
    }
  }

  // ── Extract projectile / hit VFX from HumansProjectiles.png ───────────────
  private extractProjectileVFX() {
    const src = this.textures.get('src_proj').getSourceImage() as HTMLImageElement;
    const CELL = 16; // each projectile lives in a 16×16 cell
    const SCALE = 4; // scale up 4× for screen visibility

    const vfxSprites = [
      { key: 'vfx_arrow',    sx: 0,  sy: 0  },  // row 0 col 0 — horizontal arrow
      { key: 'vfx_fireball', sx: 0,  sy: 16 },  // row 1 col 0 — fireball
      { key: 'vfx_ring',     sx: 32, sy: 32 },  // row 2 col 2 — gold impact ring
    ];

    for (const sp of vfxSprites) {
      const ct = this.textures.createCanvas(sp.key, CELL * SCALE, CELL * SCALE);
      const el = ct!.getSourceImage() as HTMLCanvasElement;
      const ctx = el.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, sp.sx, sp.sy, CELL, CELL, 0, 0, CELL * SCALE, CELL * SCALE);
      ct!.refresh();
    }
  }
}
