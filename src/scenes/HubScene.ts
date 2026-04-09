import Phaser from 'phaser';
import { GAME_W, GAME_H, TILE_W, TILE_H, TILE_HALF_W, TILE_HALF_H, HUB_COLS, HUB_ROWS, DEPTH, CAM_LERP } from '../config';
import { gridToScreen, worldToScreen, depthOf } from '../utils/IsoMath';
import { PALETTE } from '../utils/ColorPalette';
import { Player } from '../entities/Player';
import { InputManager } from '../systems/InputManager';
import { pulse } from '../utils/Easing';

// Tile IDs
const T = {
  VOID:   0,
  COBBLE: 1,
  PATH:   2,
  DIRT:   3,
  WALL:   4,
  EMBER:  5,
  WATER:  6,
} as const;

// 30x30 hub town layout (row-major, [row][col])
// prettier-ignore
const MAP_DATA: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,4,4,4,4,1,1,1,1,1,1,2,2,2,1,1,1,1,4,4,4,4,1,1,3,0,0],
  [0,0,3,1,4,1,1,4,1,1,1,1,1,1,2,2,2,1,1,1,1,4,1,1,4,1,1,3,0,0],
  [0,0,3,1,4,1,1,4,1,1,1,1,1,1,2,2,2,1,1,1,1,4,1,1,4,1,1,3,0,0],
  [0,0,3,1,4,4,4,4,1,1,1,1,2,2,2,2,2,2,2,1,1,4,4,4,4,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,2,2,2,2,2,5,5,5,5,2,2,2,2,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,2,2,5,5,5,5,5,5,5,5,5,2,2,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,2,2,5,5,5,5,5,5,5,5,5,2,2,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,4,4,4,4,2,2,5,5,5,5,5,5,5,5,5,2,2,4,4,4,4,1,1,3,0,0],
  [0,0,3,1,4,1,1,4,2,2,5,5,5,5,5,5,5,5,5,2,2,4,1,1,4,1,1,3,0,0],
  [0,0,3,1,4,1,1,4,2,2,2,2,5,5,5,5,5,2,2,2,2,4,1,1,4,1,1,3,0,0],
  [0,0,3,1,4,4,4,4,1,1,1,1,2,2,2,2,2,2,2,1,1,4,4,4,4,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,4,4,4,4,1,1,1,1,1,1,2,2,2,1,1,1,1,4,4,4,4,1,1,3,0,0],
  [0,0,3,1,4,1,1,4,1,1,1,1,1,1,2,2,2,1,1,1,1,4,1,1,4,1,1,3,0,0],
  [0,0,3,1,4,1,1,4,1,1,1,1,1,1,2,2,2,1,1,1,1,4,1,1,4,1,1,3,0,0],
  [0,0,3,1,4,4,4,4,1,1,1,1,1,1,2,2,2,1,1,1,1,4,4,4,4,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,0,0],
  [0,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

interface NPCDef {
  key: string;
  name: string;
  col: number;
  row: number;
  greeting: string;
}

const NPC_DEFS: NPCDef[] = [
  { key: 'npc_baelor',  name: 'Baelor',  col: 6,  row: 5,  greeting: 'The forge never sleeps, wanderer. Neither do I.' },
  { key: 'npc_elara',   name: 'Elara',   col: 23, row: 5,  greeting: 'I have been studying the flame for thirty years. It is afraid.' },
  { key: 'npc_mira',    name: 'Mira',    col: 6,  row: 13, greeting: "Drink's on the house tonight. God knows we need something to celebrate." },
  { key: 'npc_orin',    name: 'Orin',    col: 23, row: 13, greeting: 'Time is a circle. We have been here before. We will be here again.' },
  { key: 'npc_theo',    name: 'Theo',    col: 6,  row: 19, greeting: 'A fine cloak makes a fine wanderer. Or so I tell myself.' },
  { key: 'npc_vesna',   name: 'Vesna',   col: 23, row: 19, greeting: "I grow herbs in the dark now. They come out... different. But useful." },
  { key: 'npc_cael',    name: 'Cael',    col: 15, row: 25, greeting: 'The ember asks only that you believe in it. Do you?' },
  { key: 'npc_joren',   name: 'Joren',   col: 15, row: 3,  greeting: 'The wall holds. For now. Get below and make sure it stays that way.' },
];

export class HubScene extends Phaser.Scene {
  private player!: Player;
  private inputMgr!: InputManager;
  private groundRT!: Phaser.GameObjects.RenderTexture;
  private entityLayer!: Phaser.GameObjects.Container;
  private npcSprites: Array<{ sprite: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; data: NPCDef }> = [];
  private portalGlow!: Phaser.GameObjects.Image;
  private portalTime = 0;
  private dialogueBanner!: Phaser.GameObjects.Container;
  private dialogueBannerText!: Phaser.GameObjects.Text;
  private dialogueSpeaker!: Phaser.GameObjects.Text;
  private bannerNPC: NPCDef | null = null;
  private bannerTimer = 0;
  private emberParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fogLayer!: Phaser.GameObjects.Graphics;
  private mapOriginX = 0;
  private mapOriginY = 0;
  private dayNightAlpha = 0;  // 0 = full night, 1 = full day

  constructor() { super('HubScene'); }

  create() {
    // Map pixel origin — center the map on screen
    // In isometric, top of map is at (0,0) in world, bottom at (ROWS+COLS)*TILE_HALF_H
    const mapW = (HUB_COLS + HUB_ROWS) * TILE_HALF_W;
    const mapH = (HUB_COLS + HUB_ROWS) * TILE_HALF_H;
    this.mapOriginX = -mapW / 2;
    this.mapOriginY = -mapH / 4;

    // Camera world bounds
    this.cameras.main.setBounds(
      this.mapOriginX - GAME_W / 2,
      this.mapOriginY - GAME_H / 2,
      mapW + GAME_W,
      mapH + GAME_H
    );

    // Build ground RenderTexture
    this.buildGround();

    // Atmosphere
    this.buildAtmosphere();

    // Portal glow (center plaza)
    this.buildPortal();

    // NPCs
    this.buildNPCs();

    // Player (start at path center near portal)
    const playerStartCol = 15;
    const playerStartRow = 17;
    this.player = new Player(this, playerStartCol, playerStartRow);
    this.player.setCollisionMap(MAP_DATA, HUB_COLS, HUB_ROWS);
    this.adjustEntityToMap(this.player, playerStartCol, playerStartRow);

    // Input
    this.inputMgr = new InputManager(this);

    // Dialogue banner (bottom)
    this.buildDialogueBanner();

    // Camera follow
    this.cameras.main.startFollow(this.player, true, CAM_LERP, CAM_LERP);

    // Particles: ambient embers drifting up from plaza
    const plazaScreen = gridToScreen(14, 12);
    this.emberParticles = this.add.particles(
      plazaScreen.x + this.mapOriginX,
      plazaScreen.y + this.mapOriginY + 20,
      'particle_ember',
      {
        speed: { min: 5, max: 18 },
        angle: { min: 260, max: 280 },
        lifespan: { min: 1500, max: 3500 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.7, end: 0 },
        tint: [PALETTE.EMBER_BRIGHT, PALETTE.EMBER_MID, PALETTE.LANTERN],
        frequency: 200,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD,
      }
    );

    // Notify UIScene
    this.scene.get('UIScene')?.events?.emit('player-ready', this.player);

    // Fade in
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private buildGround() {
    const rtW = (HUB_COLS + HUB_ROWS) * TILE_HALF_W + TILE_W;
    const rtH = (HUB_COLS + HUB_ROWS) * TILE_HALF_H + TILE_H + 8;

    this.groundRT = this.add.renderTexture(
      this.mapOriginX,
      this.mapOriginY,
      rtW, rtH
    ).setOrigin(0, 0).setDepth(DEPTH.GROUND);

    // Temp graphics for drawing tiles
    const g = this.add.graphics();

    for (let row = 0; row < HUB_ROWS; row++) {
      for (let col = 0; col < HUB_COLS; col++) {
        const tileId = MAP_DATA[row]?.[col] ?? 0;
        if (tileId === T.VOID) continue;

        const key = this.tileKey(tileId);
        const screen = gridToScreen(col, row);
        const tx = screen.x + rtW / 2 - TILE_HALF_W;
        const ty = screen.y;

        this.groundRT.draw(key, tx, ty);
      }
    }

    g.destroy();
  }

  private tileKey(id: number): string {
    switch (id) {
      case T.COBBLE: return 'tile_cobble';
      case T.PATH:   return 'tile_path';
      case T.DIRT:   return 'tile_dirt';
      case T.WALL:   return 'tile_wall';
      case T.EMBER:  return 'tile_ember';
      case T.WATER:  return 'tile_water';
      default:       return 'tile_cobble';
    }
  }

  private buildAtmosphere() {
    // Fog/vignette overlay
    this.fogLayer = this.add.graphics();
    this.fogLayer.setScrollFactor(0).setDepth(DEPTH.OVERLAY - 10);

    // Gradient vignette
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const alpha = (i / steps) * 0.35;
      const margin = i * 6;
      this.fogLayer.fillStyle(0x0a0608, alpha);
      this.fogLayer.fillRect(0, 0, GAME_W, margin);
      this.fogLayer.fillRect(0, GAME_H - margin, GAME_W, margin);
      this.fogLayer.fillRect(0, 0, margin, GAME_H);
      this.fogLayer.fillRect(GAME_W - margin, 0, margin, GAME_H);
    }

    // Dusk tint overlay (starts dark, lightens to day)
    const nightOverlay = this.add.graphics();
    nightOverlay.fillStyle(0x0d0a1a, 0.45);
    nightOverlay.fillRect(0, 0, GAME_W, GAME_H);
    nightOverlay.setScrollFactor(0).setDepth(DEPTH.OVERLAY - 5).setAlpha(0.6);
    // Slowly fade the night overlay
    this.tweens.add({
      targets: nightOverlay,
      alpha: 0.2,
      duration: 12000,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private buildPortal() {
    const portalCol = 14;
    const portalRow = 12;
    const screen = gridToScreen(portalCol, portalRow);
    const px = screen.x + this.mapOriginX + (HUB_COLS + HUB_ROWS) * TILE_HALF_W / 2 - TILE_HALF_W;
    const py = screen.y + this.mapOriginY;

    // Outer glow ring
    const outerGlow = this.add.graphics();
    outerGlow.fillStyle(PALETTE.EMBER_MID, 0.06);
    outerGlow.fillEllipse(px, py, 90, 45);
    outerGlow.setDepth(DEPTH.GROUND + 1);

    // Portal pillar pieces
    for (let i = 0; i < 2; i++) {
      const pillar = this.add.image(px + (i === 0 ? -18 : 18), py - 20, 'prop_portal_piece')
        .setDepth(DEPTH.ENTITY_BASE + py)
        .setScale(0.7);
      this.tweens.add({
        targets: pillar,
        y: py - 24,
        duration: 2000 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    // Center column of ember light
    this.portalGlow = this.add.image(px, py - 30, 'light_radial')
      .setDepth(DEPTH.ENTITY_BASE + py)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.6)
      .setTint(PALETTE.EMBER_MID);
  }

  private buildNPCs() {
    for (const def of NPC_DEFS) {
      const screen = gridToScreen(def.col, def.row);
      const sx = screen.x + this.mapOriginX + (HUB_COLS + HUB_ROWS) * TILE_HALF_W / 2 - TILE_HALF_W;
      const sy = screen.y + this.mapOriginY;

      const sprite = this.add.image(sx, sy - 10, def.key, 0)
        .setDepth(depthOf(def.col, def.row) + 20)
        .setScale(1.2);

      // Name label
      const label = this.add.text(sx, sy - 26, def.name, {
        fontFamily: 'monospace',
        fontSize: '5px',
        color: '#e8d5b0',
        backgroundColor: '#110b0f',
        padding: { x: 2, y: 1 },
      }).setOrigin(0.5).setDepth(depthOf(def.col, def.row) + 21).setAlpha(0.7);

      // Idle bob tween
      this.tweens.add({
        targets: sprite,
        y: sy - 13,
        duration: 1800 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });

      // Walk cycle (swap frame)
      this.time.addEvent({
        delay: 900 + Math.random() * 300,
        callback: () => {
          sprite.setFrame(sprite.frame.name === '0' ? 1 : 0);
        },
        loop: true,
      });

      this.npcSprites.push({ sprite, label, data: def });
    }
  }

  private buildDialogueBanner() {
    this.dialogueBanner = this.add.container(GAME_W / 2, GAME_H - 45);
    this.dialogueBanner.setScrollFactor(0).setDepth(DEPTH.DIALOGUE).setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x110b0f, 0.92);
    bg.fillRect(-140, -22, 280, 44);
    bg.lineStyle(1.5, PALETTE.EMBER_MID, 0.8);
    bg.strokeRect(-140, -22, 280, 44);
    bg.lineStyle(1, PALETTE.STONE_DARK, 0.5);
    bg.strokeRect(-138, -20, 276, 40);
    this.dialogueBanner.add(bg);

    this.dialogueSpeaker = this.add.text(-130, -16, '', {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#ff6b35',
      letterSpacing: 1,
    });
    this.dialogueBanner.add(this.dialogueSpeaker);

    this.dialogueBannerText = this.add.text(-130, -5, '', {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#e8d5b0',
      wordWrap: { width: 260 },
      lineSpacing: 2,
    });
    this.dialogueBanner.add(this.dialogueBannerText);

    const pressHint = this.add.text(110, 14, '[E] Talk', {
      fontFamily: 'monospace',
      fontSize: '5px',
      color: '#5a4a3a',
    });
    this.dialogueBanner.add(pressHint);
  }

  private adjustEntityToMap(entity: { x: number; y: number; setDepth: (d: number) => void }, col: number, row: number) {
    const screen = gridToScreen(col, row);
    const rtW = (HUB_COLS + HUB_ROWS) * TILE_HALF_W;
    entity.x = screen.x + this.mapOriginX + rtW / 2 - TILE_HALF_W;
    entity.y = screen.y + this.mapOriginY - 10;
    entity.setDepth(depthOf(col, row) + 50);
  }

  private showDialogue(npc: NPCDef) {
    this.bannerNPC = npc;
    this.bannerTimer = 4000;
    this.dialogueSpeaker.setText(npc.name.toUpperCase());
    this.dialogueBannerText.setText(npc.greeting);
    this.tweens.add({
      targets: this.dialogueBanner,
      alpha: 1,
      duration: 200,
      ease: 'Sine.Out',
    });
  }

  private hideDialogue() {
    this.bannerNPC = null;
    this.tweens.add({
      targets: this.dialogueBanner,
      alpha: 0,
      duration: 300,
    });
  }

  update(time: number, delta: number) {
    this.portalTime += delta / 1000;

    // Input
    const inputState = this.inputMgr.getState();
    this.player.setVelocity(inputState.worldDX, inputState.worldDY);
    this.player.update(delta);

    // Portal pulse
    this.portalGlow.setAlpha(0.5 + Math.sin(this.portalTime * 2.5) * 0.3);
    this.portalGlow.setScale(0.5 + Math.sin(this.portalTime * 1.8) * 0.08);

    // NPC proximity check for dialogue banner
    const pw = this.player.worldX;
    const ph = this.player.worldY;

    let nearestNPC: NPCDef | null = null;
    let nearestDist = 3.5; // tile units

    for (const npc of this.npcSprites) {
      const dist = Math.sqrt(
        Math.pow(pw - npc.data.col, 2) + Math.pow(ph - npc.data.row, 2)
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestNPC = npc.data;
      }
    }

    if (nearestNPC && this.bannerNPC !== nearestNPC) {
      this.showDialogue(nearestNPC);
    } else if (!nearestNPC && this.bannerNPC) {
      this.hideDialogue();
    }

    // Auto-hide banner after timer
    if (this.bannerNPC) {
      this.bannerTimer -= delta;
      if (this.bannerTimer <= 0) this.hideDialogue();
    }

    // Emit stats to UIScene
    this.events.emit('update-stats', this.player.getStats());

    // Sync player world position to screen correctly
    const rtW = (HUB_COLS + HUB_ROWS) * TILE_HALF_W;
    const playerScreen = gridToScreen(this.player.worldX, this.player.worldY);
    this.player.x = playerScreen.x + this.mapOriginX + rtW / 2 - TILE_HALF_W;
    this.player.y = playerScreen.y + this.mapOriginY - 10;
    this.player.setDepth(depthOf(this.player.worldX, this.player.worldY) + 50);
  }
}
