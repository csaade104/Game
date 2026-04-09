import Phaser from 'phaser';
import { PALETTE } from '../utils/ColorPalette';
import { TILE_W, TILE_H } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    this.generateTiles();
    this.generatePlayer();
    this.generateNPCs();
    this.generateUI();
    this.generateParticles();
    this.generateProps();
    document.getElementById('loading-text')?.remove();
    this.scene.start('PreloadScene');
  }

  private gfx(): Phaser.GameObjects.Graphics {
    return this.add.graphics();
  }

  // ── Isometric diamond tile ────────────────────────────────────────────────
  private drawDiamond(
    g: Phaser.GameObjects.Graphics,
    fill: number,
    top: number,
    left: number,
    right: number,
    shade = 0.55
  ) {
    const tw = TILE_W, th = TILE_H;
    // Top face
    g.fillStyle(fill, 1);
    g.fillPoints([
      { x: tw / 2, y: 0 },
      { x: tw, y: th / 2 },
      { x: tw / 2, y: th },
      { x: 0, y: th / 2 },
    ], true);
    // Left face (slightly darker)
    g.fillStyle(left, 1);
    g.fillPoints([
      { x: 0, y: th / 2 },
      { x: tw / 2, y: th },
      { x: tw / 2, y: th + 8 },
      { x: 0, y: th / 2 + 8 },
    ], true);
    // Right face (darkest)
    g.fillStyle(right, 1);
    g.fillPoints([
      { x: tw, y: th / 2 },
      { x: tw / 2, y: th },
      { x: tw / 2, y: th + 8 },
      { x: tw, y: th / 2 + 8 },
    ], true);
  }

  private generateTiles() {
    const tw = TILE_W, th = TILE_H + 8;

    // ── Cobblestone ground ────────────────────────────────────────────────
    {
      const g = this.gfx();
      this.drawDiamond(g, 0x5c4a3a, 0x5c4a3a, 0x3e3228, 0x2e2518);
      // mortar lines on top face
      g.lineStyle(1, 0x3a2c20, 0.5);
      g.beginPath(); g.moveTo(tw/2, th/2-2); g.lineTo(tw*0.75, th/4); g.strokePath();
      g.beginPath(); g.moveTo(tw/4, th/4+2); g.lineTo(tw/2, th/2-2); g.strokePath();
      g.beginPath(); g.moveTo(tw/2, th/2+2); g.lineTo(tw*0.75, th*0.75-2); g.strokePath();
      g.generateTexture('tile_cobble', tw, th);
      g.destroy();
    }

    // ── Stone path ────────────────────────────────────────────────────────
    {
      const g = this.gfx();
      this.drawDiamond(g, 0x6b5a46, 0x6b5a46, 0x4a3a2e, 0x362a20);
      g.lineStyle(1, 0x4a3a2e, 0.4);
      g.beginPath(); g.moveTo(tw*0.3, th*0.4); g.lineTo(tw*0.7, th*0.4); g.strokePath();
      g.generateTexture('tile_path', tw, th);
      g.destroy();
    }

    // ── Dirt / grass edge ─────────────────────────────────────────────────
    {
      const g = this.gfx();
      this.drawDiamond(g, 0x4a3020, 0x4a3020, 0x362012, 0x28180a);
      g.generateTexture('tile_dirt', tw, th);
      g.destroy();
    }

    // ── Dark void tile ────────────────────────────────────────────────────
    {
      const g = this.gfx();
      g.fillStyle(0x0a0608, 1);
      g.fillRect(0, 0, tw, th);
      g.generateTexture('tile_void', tw, th);
      g.destroy();
    }

    // ── Ember plaza tile (special glow) ────────────────────────────────────
    {
      const g = this.gfx();
      this.drawDiamond(g, 0x6a4030, 0x6a4030, 0x4a2820, 0x381a12);
      g.fillStyle(0xff6b35, 0.15);
      g.fillPoints([
        { x: tw/2, y: 0 }, { x: tw, y: th/2 },
        { x: tw/2, y: th }, { x: 0, y: th/2 },
      ], true);
      g.generateTexture('tile_ember', tw, th);
      g.destroy();
    }

    // ── Stone wall block ──────────────────────────────────────────────────
    {
      const g = this.gfx();
      const wh = 32; // wall height
      // Front face left
      g.fillStyle(0x3a2c20, 1);
      g.fillRect(0, th/2, tw/2, wh);
      // Front face right (darker)
      g.fillStyle(0x2a1e14, 1);
      g.fillRect(tw/2, th/2, tw/2, wh);
      // Top face
      g.fillStyle(0x5c4a3a, 1);
      g.fillPoints([
        { x: tw/2, y: 0 }, { x: tw, y: th/2 },
        { x: tw/2, y: th }, { x: 0, y: th/2 },
      ], true);
      // highlight edge
      g.lineStyle(1, 0x7a6050, 0.6);
      g.beginPath(); g.moveTo(tw/2, 0); g.lineTo(tw, th/2); g.strokePath();
      g.generateTexture('tile_wall', tw, th + wh);
      g.destroy();
    }

    // ── Water / shadow pool ───────────────────────────────────────────────
    {
      const g = this.gfx();
      this.drawDiamond(g, 0x0d1a2e, 0x0d1a2e, 0x0a1020, 0x080c18);
      g.fillStyle(0x1a3a6a, 0.3);
      g.fillPoints([
        { x: tw/2, y: 2 }, { x: tw-2, y: th/2 },
        { x: tw/2, y: th-2 }, { x: 2, y: th/2 },
      ], true);
      g.generateTexture('tile_water', tw, th);
      g.destroy();
    }
  }

  // ── Player sprite sheet ───────────────────────────────────────────────────
  private generatePlayer() {
    const fw = 24, fh = 32; // frame size
    const dirs = 4;          // S W E N
    const frames = 4;        // idle walk walk walk

    const canvas = this.textures.createCanvas('player', fw * frames, fh * dirs);
    const ctx = canvas!.getSourceImage() as HTMLCanvasElement;
    const c = ctx.getContext('2d')!;

    const drawChar = (x: number, y: number, walkPhase: number, dir: number) => {
      c.clearRect(x, y, fw, fh);
      const bobY = walkPhase > 0 ? Math.sin(walkPhase * Math.PI) * 2 : 0;
      const by = y + bobY;

      // cloak / cape (behind body)
      const cloakColors = ['#4a2a5a', '#382048'];
      c.fillStyle = cloakColors[0];
      if (dir === 0 || dir === 1) { // south / west — cloak visible
        c.fillRect(x + 5, by + 8, 14, 18);
        c.fillStyle = cloakColors[1];
        c.fillRect(x + 7, by + 16, 10, 8);
      }

      // boots
      c.fillStyle = '#3a2818';
      c.fillRect(x + 7, by + 24, 4, 6);
      c.fillRect(x + 13, by + 24, 4, 6);

      // legs / trousers
      c.fillStyle = '#2e3040';
      c.fillRect(x + 7, by + 18, 10, 8);

      // torso — leather cuirass
      c.fillStyle = '#5a3a20';
      c.fillRect(x + 6, by + 10, 12, 10);
      // chest highlight
      c.fillStyle = '#7a5030';
      c.fillRect(x + 7, by + 11, 4, 4);

      // arms
      c.fillStyle = '#4a2e14';
      c.fillRect(x + 4, by + 11, 3, 8);   // left
      c.fillRect(x + 17, by + 11, 3, 8);  // right

      // neck
      c.fillStyle = '#e8c9a0';
      c.fillRect(x + 10, by + 8, 4, 3);

      // head
      c.fillStyle = '#e8c9a0';
      c.fillRect(x + 8, by + 2, 8, 8);

      // hair
      c.fillStyle = '#1a0e08';
      c.fillRect(x + 8, by + 2, 8, 3);
      if (dir !== 0) { // not looking south — side hair
        c.fillRect(x + 8, by + 2, 2, 6);
      }

      // eyes (depending on dir)
      c.fillStyle = '#1a1a2a';
      if (dir === 0) { // south
        c.fillRect(x + 10, by + 7, 2, 2);
        c.fillRect(x + 14, by + 7, 2, 2);
      } else if (dir === 2) { // east
        c.fillRect(x + 14, by + 6, 2, 2);
      } else if (dir === 1) { // west
        c.fillRect(x + 8, by + 6, 2, 2);
      }

      // sword (right hand, east/south visible)
      if (dir === 0 || dir === 2) {
        c.fillStyle = '#8ab0c0';
        c.fillRect(x + 19, by + 10, 2, 12);
        c.fillStyle = '#c09040';
        c.fillRect(x + 17, by + 13, 6, 2); // crossguard
        c.fillStyle = '#6a4020';
        c.fillRect(x + 19, by + 21, 2, 4); // grip
      }
    };

    const dirOrder = [0, 1, 2, 3]; // S W E N
    for (let d = 0; d < dirs; d++) {
      // frame 0 = idle, frames 1-3 = walk cycle
      for (let f = 0; f < frames; f++) {
        drawChar(f * fw, d * fh, f === 0 ? 0 : f / 3, dirOrder[d]);
      }
    }

    canvas!.refresh();

    // Add frame data to texture manager
    const tex = this.textures.get('player');
    tex.add('idle_s',   0, 0,      0,    fw, fh);
    tex.add('walk_s_1', 0, fw,     0,    fw, fh);
    tex.add('walk_s_2', 0, fw*2,   0,    fw, fh);
    tex.add('walk_s_3', 0, fw*3,   0,    fw, fh);
    tex.add('idle_w',   0, 0,      fh,   fw, fh);
    tex.add('walk_w_1', 0, fw,     fh,   fw, fh);
    tex.add('walk_w_2', 0, fw*2,   fh,   fw, fh);
    tex.add('walk_w_3', 0, fw*3,   fh,   fw, fh);
    tex.add('idle_e',   0, 0,      fh*2, fw, fh);
    tex.add('walk_e_1', 0, fw,     fh*2, fw, fh);
    tex.add('walk_e_2', 0, fw*2,   fh*2, fw, fh);
    tex.add('walk_e_3', 0, fw*3,   fh*2, fw, fh);
    tex.add('idle_n',   0, 0,      fh*3, fw, fh);
    tex.add('walk_n_1', 0, fw,     fh*3, fw, fh);
    tex.add('walk_n_2', 0, fw*2,   fh*3, fw, fh);
    tex.add('walk_n_3', 0, fw*3,   fh*3, fw, fh);
  }

  // ── NPC sprites ────────────────────────────────────────────────────────────
  private generateNPCs() {
    const npcDefs: Array<{ key: string; tunic: string; hair: string; skin: string }> = [
      { key: 'npc_baelor',  tunic: '#6a3a20', hair: '#5a3010', skin: '#c0906a' },
      { key: 'npc_elara',   tunic: '#2a3a6a', hair: '#8a6a2a', skin: '#e8c9a0' },
      { key: 'npc_mira',    tunic: '#5a3a4a', hair: '#4a2020', skin: '#d4a882' },
      { key: 'npc_theo',    tunic: '#3a4a2a', hair: '#2a1a0a', skin: '#e0ba90' },
      { key: 'npc_orin',    tunic: '#4a4a5a', hair: '#8a8a9a', skin: '#b09070' },
      { key: 'npc_vesna',   tunic: '#2a5a3a', hair: '#1a2a1a', skin: '#c8b090' },
      { key: 'npc_cael',    tunic: '#5a4a2a', hair: '#1a1a1a', skin: '#d0a878' },
      { key: 'npc_joren',   tunic: '#3a3a5a', hair: '#2a2a3a', skin: '#c09070' },
    ];

    for (const def of npcDefs) {
      const fw = 16, fh = 24;
      const canvas = this.textures.createCanvas(def.key, fw * 2, fh);
      const ctx = canvas!.getSourceImage() as HTMLCanvasElement;
      const c = ctx.getContext('2d')!;

      for (let f = 0; f < 2; f++) {
        const x = f * fw;
        const bob = f === 1 ? 1 : 0;

        // feet
        c.fillStyle = '#2a1810';
        c.fillRect(x+3, fh-4+bob, 3, 3);
        c.fillRect(x+9, fh-4+bob, 3, 3);

        // legs
        c.fillStyle = '#2e3040';
        c.fillRect(x+3, fh-8+bob, 10, 5);

        // tunic
        c.fillStyle = def.tunic;
        c.fillRect(x+2, fh-16+bob, 12, 9);

        // arms
        c.fillStyle = def.skin;
        c.fillRect(x+0, fh-15+bob, 3, 6);
        c.fillRect(x+13, fh-15+bob, 3, 6);

        // head
        c.fillStyle = def.skin;
        c.fillRect(x+3, fh-24+bob, 10, 9);

        // hair
        c.fillStyle = def.hair;
        c.fillRect(x+3, fh-24+bob, 10, 3);
        c.fillRect(x+3, fh-21+bob, 2, 3);

        // eyes
        c.fillStyle = '#1a1a2a';
        c.fillRect(x+5, fh-19+bob, 2, 2);
        c.fillRect(x+9, fh-19+bob, 2, 2);
      }
      canvas!.refresh();
    }
  }

  // ── UI elements ────────────────────────────────────────────────────────────
  private generateUI() {
    // HP bar fill
    {
      const g = this.gfx();
      g.fillStyle(0xc0392b, 1);
      g.fillRect(0, 0, 100, 8);
      g.fillStyle(0xe74c3c, 1);
      g.fillRect(0, 0, 100, 3);
      g.generateTexture('bar_hp', 100, 8);
      g.destroy();
    }
    // Stamina bar
    {
      const g = this.gfx();
      g.fillStyle(0x27ae60, 1);
      g.fillRect(0, 0, 100, 6);
      g.fillStyle(0x2ecc71, 1);
      g.fillRect(0, 0, 100, 2);
      g.generateTexture('bar_stamina', 100, 6);
      g.destroy();
    }
    // Mana bar
    {
      const g = this.gfx();
      g.fillStyle(0x2980b9, 1);
      g.fillRect(0, 0, 100, 6);
      g.fillStyle(0x3498db, 1);
      g.fillRect(0, 0, 100, 2);
      g.generateTexture('bar_mana', 100, 6);
      g.destroy();
    }
    // Bar background
    {
      const g = this.gfx();
      g.fillStyle(0x1a1010, 1);
      g.fillRect(0, 0, 100, 8);
      g.lineStyle(1, 0x4a3020, 1);
      g.strokeRect(0, 0, 100, 8);
      g.generateTexture('bar_bg', 100, 8);
      g.destroy();
    }
    // Dialogue box
    {
      const g = this.gfx();
      g.fillStyle(0x110b0f, 0.93);
      g.fillRect(0, 0, 360, 80);
      g.lineStyle(2, 0xff6b35, 1);
      g.strokeRect(0, 0, 360, 80);
      g.lineStyle(1, 0x4a3020, 1);
      g.strokeRect(2, 2, 356, 76);
      g.generateTexture('dialogue_box', 360, 80);
      g.destroy();
    }
    // Ember icon (currency)
    {
      const g = this.gfx();
      g.fillStyle(0xff6b35, 1);
      g.fillCircle(6, 6, 5);
      g.fillStyle(0xffd166, 1);
      g.fillCircle(5, 5, 2);
      g.generateTexture('icon_ember', 12, 12);
      g.destroy();
    }
    // Joystick base
    {
      const g = this.gfx();
      g.fillStyle(0x000000, 0.35);
      g.fillCircle(40, 40, 40);
      g.lineStyle(2, 0xff6b35, 0.4);
      g.strokeCircle(40, 40, 40);
      g.generateTexture('joystick_base', 80, 80);
      g.destroy();
    }
    // Joystick thumb
    {
      const g = this.gfx();
      g.fillStyle(0xff6b35, 0.7);
      g.fillCircle(22, 22, 22);
      g.fillStyle(0xffd166, 0.4);
      g.fillCircle(18, 18, 10);
      g.generateTexture('joystick_thumb', 44, 44);
      g.destroy();
    }
    // Pixel font for ember numbers (placeholder)
    {
      const g = this.gfx();
      g.fillStyle(0xffd166, 1);
      g.fillRect(0, 0, 4, 6);
      g.generateTexture('pixel_dot', 4, 6);
      g.destroy();
    }
  }

  // ── Particles & VFX ────────────────────────────────────────────────────────
  private generateParticles() {
    // Ember spark
    {
      const g = this.gfx();
      g.fillStyle(0xff8c42, 1);
      g.fillRect(0, 0, 3, 3);
      g.generateTexture('particle_ember', 3, 3);
      g.destroy();
    }
    // Smoke wisp
    {
      const g = this.gfx();
      g.fillStyle(0x7a8ab0, 0.5);
      g.fillCircle(4, 4, 4);
      g.generateTexture('particle_smoke', 8, 8);
      g.destroy();
    }
    // Portal energy
    {
      const g = this.gfx();
      g.fillStyle(0xff6b35, 0.8);
      g.fillRect(0, 0, 4, 4);
      g.fillStyle(0xffd166, 1);
      g.fillRect(1, 1, 2, 2);
      g.generateTexture('particle_portal', 4, 4);
      g.destroy();
    }
    // Light radial gradient (for lanterns)
    {
      const g = this.gfx();
      const steps = 16;
      for (let i = steps; i >= 0; i--) {
        const alpha = (i / steps) * 0.6;
        const r = (i / steps) * 48;
        g.fillStyle(0xffd166, alpha);
        g.fillCircle(48, 48, r);
      }
      g.generateTexture('light_radial', 96, 96);
      g.destroy();
    }
    // Shadow circle (under entities)
    {
      const g = this.gfx();
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(16, 6, 28, 8);
      g.generateTexture('entity_shadow', 32, 12);
      g.destroy();
    }
  }

  // ── Props (forge, portal, barrels, etc.) ────────────────────────────────────
  private generateProps() {
    // Portal pillar
    {
      const g = this.gfx();
      // Base
      g.fillStyle(0x3a2c20, 1);
      g.fillRect(8, 32, 16, 16);
      // Pillar
      g.fillStyle(0x5c4a3a, 1);
      g.fillRect(10, 8, 12, 26);
      // Glow core
      g.fillStyle(0xff6b35, 0.9);
      g.fillRect(13, 4, 6, 30);
      g.fillStyle(0xffd166, 1);
      g.fillRect(14, 2, 4, 8);
      g.generateTexture('prop_portal_piece', 32, 48);
      g.destroy();
    }
    // Barrel
    {
      const g = this.gfx();
      g.fillStyle(0x7a4f2a, 1);
      g.fillRect(2, 4, 12, 14);
      g.fillStyle(0x5a3010, 1);
      g.fillRect(2, 6, 12, 2);
      g.fillRect(2, 12, 12, 2);
      g.fillStyle(0x4a3010, 1);
      g.fillRect(0, 4, 2, 14);
      g.generateTexture('prop_barrel', 16, 20);
      g.destroy();
    }
    // Lantern post
    {
      const g = this.gfx();
      // post
      g.fillStyle(0x4a3020, 1);
      g.fillRect(5, 8, 3, 24);
      // lantern box
      g.fillStyle(0x3a2810, 1);
      g.fillRect(2, 2, 10, 10);
      g.fillStyle(0xffd166, 0.8);
      g.fillRect(4, 4, 6, 6);
      g.lineStyle(1, 0x6a5030, 1);
      g.strokeRect(2, 2, 10, 10);
      g.generateTexture('prop_lantern', 13, 32);
      g.destroy();
    }
    // Campfire
    {
      const g = this.gfx();
      // logs
      g.fillStyle(0x5a3010, 1);
      g.fillRect(2, 10, 12, 4);
      g.fillRect(5, 8, 6, 6);
      // flame
      g.fillStyle(0xff6b35, 0.9);
      g.fillTriangle(8, 0, 4, 10, 12, 10);
      g.fillStyle(0xffd166, 1);
      g.fillTriangle(8, 3, 6, 9, 10, 9);
      g.generateTexture('prop_campfire', 16, 16);
      g.destroy();
    }
    // Chest
    {
      const g = this.gfx();
      g.fillStyle(0x7a4f2a, 1);
      g.fillRect(0, 6, 20, 14);
      g.fillStyle(0x5a3010, 1);
      g.fillRect(0, 4, 20, 4);
      g.fillStyle(0xc09040, 1);
      g.fillRect(8, 10, 4, 4); // latch
      g.lineStyle(1, 0x4a2808, 1);
      g.strokeRect(0, 4, 20, 16);
      g.generateTexture('prop_chest', 20, 20);
      g.destroy();
    }
    // Tombstone / memorial
    {
      const g = this.gfx();
      g.fillStyle(0x4a4040, 1);
      g.fillRect(4, 6, 12, 18);
      g.fillStyle(0x5a5050, 1);
      g.fillRect(0, 10, 20, 4); // crossbar
      g.fillStyle(0x3a3030, 1);
      g.fillRect(6, 20, 8, 4); // base
      g.generateTexture('prop_tombstone', 20, 26);
      g.destroy();
    }
  }
}
