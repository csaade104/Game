import Phaser from 'phaser';
import { PALETTE } from '../utils/ColorPalette';

const TARGET_H = 40; // All NPC sprites scaled to this height

interface NpcSheetConfig {
  npcKey: string;
  fileKey: string;
  fw: number; // source frame width
  fh: number; // source frame height
}

const NPC_SHEETS: NpcSheetConfig[] = [
  { npcKey: 'npc_baelor', fileKey: 'src_halberd',  fw: 24, fh: 24 },
  { npcKey: 'npc_elara',  fileKey: 'src_mage',     fw: 44, fh: 32 },
  { npcKey: 'npc_mira',   fileKey: 'src_shield',   fw: 24, fh: 28 },
  { npcKey: 'npc_orin',   fileKey: 'src_king',     fw: 40, fh: 28 },
  { npcKey: 'npc_theo',   fileKey: 'src_prince',   fw: 24, fh: 24 },
  { npcKey: 'npc_vesna',  fileKey: 'src_archmage', fw: 44, fh: 36 },
  { npcKey: 'npc_cael',   fileKey: 'src_sword',    fw: 24, fh: 24 },
  { npcKey: 'npc_joren',  fileKey: 'src_cavalier', fw: 32, fh: 28 },
];

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

    // ── NPC Sprite Sheets (Minifolks) ──────────────────────────────────────────
    this.load.image('src_halberd',  'assets/MinifolksHumans/Outline/MiniHalberdMan.png');
    this.load.image('src_mage',     'assets/MinifolksHumans/Outline/MiniMage.png');
    this.load.image('src_shield',   'assets/MinifolksHumans/Outline/MiniShieldMan.png');
    this.load.image('src_king',     'assets/MinifolksHumans/Outline/MiniKingMan.png');
    this.load.image('src_prince',   'assets/MinifolksHumans/Outline/MiniPrinceMan.png');
    this.load.image('src_archmage', 'assets/MinifolksHumans/Outline/MiniArchMage.png');
    this.load.image('src_sword',    'assets/MinifolksHumans/Outline/MiniSwordMan.png');
    this.load.image('src_cavalier', 'assets/MinifolksHumans/Outline/MiniCavalierMan.png');
  }

  create() {
    this.extractNPCSprites();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TitleScene');
    });
  }

  // ── Extract 2 animation frames per NPC, scale to TARGET_H ─────────────────
  private extractNPCSprites() {
    for (const cfg of NPC_SHEETS) {
      const srcTex = this.textures.get(cfg.fileKey);
      const srcImg = srcTex.getSourceImage() as HTMLImageElement;

      // Scale to reach TARGET_H; keep aspect ratio per frame
      const scale = TARGET_H / cfg.fh;
      const dw = Math.round(cfg.fw * scale);
      const dh = TARGET_H;

      // Create canvas: two frames side-by-side
      const ct = this.textures.createCanvas(cfg.npcKey, dw * 2, dh);
      const el = ct!.getSourceImage() as HTMLCanvasElement;
      const ctx = el.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      // Frame 0: idle (column 0, row 0)
      ctx.drawImage(srcImg, 0, 0, cfg.fw, cfg.fh, 0, 0, dw, dh);
      // Frame 1: step (column 1, row 0)
      ctx.drawImage(srcImg, cfg.fw, 0, cfg.fw, cfg.fh, dw, 0, dw, dh);

      ct!.refresh();

      // Register named frames so HubScene can call setFrame('0') / setFrame('1')
      const tex = this.textures.get(cfg.npcKey);
      tex.add('0', 0, 0,  0, dw, dh);
      tex.add('1', 0, dw, 0, dw, dh);
    }
  }
}
