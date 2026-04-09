import Phaser from 'phaser';
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
    this.generateBuildings();
    document.getElementById('loading-text')?.remove();
    this.scene.start('PreloadScene');
  }

  // ── Isometric building generator ─────────────────────────────────────────
  private makeBuilding(key: string, W: number, D: number, H: number, opts: {
    leftCol: number; rightCol: number; roofCol: number;
    winCol: number; stories: number;
    roofTrim?: number;
    detail?: (ctx: CanvasRenderingContext2D, c: Record<string,{x:number,y:number}>) => void;
  }) {
    const TW = 32, TH = 16;
    const padTop = (W + D) * TH + 6;
    const cw = (W + D) * TW;
    const ch = padTop + H + 4;

    const ct = this.textures.createCanvas(key, cw, ch);
    const el = ct!.getSourceImage() as HTMLCanvasElement;
    const ctx = el.getContext('2d')!;

    const h = (n: number) => '#' + n.toString(16).padStart(6,'0');
    const poly = (pts: number[][], fill: string, line = '#0a0608', lw = 1) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke();
    };

    // Corner positions
    const fGx = D*TW, fGy = padTop + H;
    const lGx = fGx+W*TW, lGy = fGy-W*TH;
    const rGx = fGx-D*TW, rGy = fGy-D*TH;
    const bGx = fGx+(W-D)*TW, bGy = fGy-(W+D)*TH;
    const fTy = fGy-H, lTy = lGy-H, rTy = rGy-H, bTy = bGy-H;

    // Left face (visible south-west wall)
    poly([[fGx,fGy],[lGx,lGy],[lGx,lTy],[fGx,fTy]], h(opts.leftCol));
    // Stone course lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
    for (let s = 1; s < opts.stories; s++) {
      const v = s / opts.stories;
      const y0 = fGy - v*H, y1 = lGy - v*H;
      ctx.beginPath(); ctx.moveTo(fGx, y0); ctx.lineTo(lGx, y1); ctx.stroke();
    }
    // Left face windows
    for (let s = 0; s < opts.stories; s++) {
      const nw = Math.max(1, W - 1);
      for (let w = 0; w < nw; w++) {
        const u = (w + 0.5) / nw;
        const v = 1 - (s + 0.6) / opts.stories;
        const wx = fGx + u*W*TW, wy = fGy - u*W*TH - v*H;
        const ww = 5, wh = 7;
        // parallelogram window matching face slope (-0.5)
        ctx.beginPath();
        ctx.moveTo(wx-ww, wy+wh+ww*0.5); ctx.lineTo(wx+ww, wy+wh-ww*0.5);
        ctx.lineTo(wx+ww, wy-wh-ww*0.5); ctx.lineTo(wx-ww, wy-wh+ww*0.5);
        ctx.closePath();
        ctx.fillStyle = h(opts.winCol); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,120,0.25)'; ctx.lineWidth = 0.5; ctx.stroke();
        // inner glow dot
        ctx.fillStyle = 'rgba(255,255,200,0.4)';
        ctx.fillRect(wx-1, wy-2, 2, 2);
      }
    }
    // Left face edge outline
    ctx.strokeStyle = '#08040a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(fGx,fGy); ctx.lineTo(lGx,lGy); ctx.lineTo(lGx,lTy); ctx.lineTo(fGx,fTy); ctx.closePath(); ctx.stroke();

    // Right face (visible south-east wall, darker)
    poly([[fGx,fGy],[rGx,rGy],[rGx,rTy],[fGx,fTy]], h(opts.rightCol));
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
    for (let s = 1; s < opts.stories; s++) {
      const v = s / opts.stories;
      ctx.beginPath(); ctx.moveTo(fGx, fGy-v*H); ctx.lineTo(rGx, rGy-v*H); ctx.stroke();
    }
    for (let s = 0; s < opts.stories; s++) {
      const nw = Math.max(1, D - 1);
      for (let w = 0; w < nw; w++) {
        const u = (w + 0.5) / nw;
        const v = 1 - (s + 0.6) / opts.stories;
        const wx = fGx - u*D*TW, wy = fGy - u*D*TH - v*H;
        const ww = 5, wh = 7;
        ctx.beginPath();
        ctx.moveTo(wx-ww, wy+wh-ww*0.5); ctx.lineTo(wx+ww, wy+wh+ww*0.5);
        ctx.lineTo(wx+ww, wy-wh+ww*0.5); ctx.lineTo(wx-ww, wy-wh-ww*0.5);
        ctx.closePath();
        ctx.fillStyle = h(opts.winCol >> 1 & 0x7f7f7f | opts.winCol & 0x808080); ctx.fill();
      }
    }
    ctx.strokeStyle = '#08040a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(fGx,fGy); ctx.lineTo(rGx,rGy); ctx.lineTo(rGx,rTy); ctx.lineTo(fGx,fTy); ctx.closePath(); ctx.stroke();

    // Roof
    poly([[fGx,fTy],[lGx,lTy],[bGx,bTy],[rGx,rTy]], h(opts.roofCol), '#08040a');
    // Roof trim highlight
    const trim = opts.roofTrim ?? opts.roofCol;
    ctx.strokeStyle = h(trim); ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(fGx,fTy); ctx.lineTo(lGx,lTy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fGx,fTy); ctx.lineTo(rGx,rTy); ctx.stroke();
    ctx.globalAlpha = 1;

    // Custom detail callback
    const corners = {fG:{x:fGx,y:fGy},lG:{x:lGx,y:lGy},rG:{x:rGx,y:rGy},bG:{x:bGx,y:bGy},
                     fT:{x:fGx,y:fTy},lT:{x:lGx,y:lTy},rT:{x:rGx,y:rTy},bT:{x:bGx,y:bTy}};
    if (opts.detail) opts.detail(ctx, corners);

    ct!.refresh();
  }

  private generateBuildings() {
    // ── FORGE (Baelor) — dark stone, fire-orange glow ─────────────────────
    this.makeBuilding('bld_forge', 4, 4, 80, {
      leftCol:0x2e2420, rightCol:0x201a18, roofCol:0x1a1210, roofTrim:0x5a3820,
      winCol:0xff6020, stories:2,
      detail(ctx, c) {
        // Chimney on left face top
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(c.lG.x-18, c.lT.y-24, 10, 24);
        ctx.fillStyle = '#2a1818'; ctx.fillRect(c.lG.x-20, c.lT.y-26, 14, 4);
        // Forge glow above chimney
        ctx.fillStyle = 'rgba(255,90,10,0.35)';
        ctx.beginPath(); ctx.ellipse(c.lG.x-13, c.lT.y-28, 7, 5, 0, 0, Math.PI*2); ctx.fill();
        // Roof anvil silhouette
        const ax = (c.fT.x+c.bT.x)/2+4, ay = c.fT.y-6;
        ctx.fillStyle = '#0a0608'; ctx.fillRect(ax-5, ay-3, 10, 3); ctx.fillRect(ax-3, ay-7, 6, 4);
        // Door arch left face
        const dx = c.fG.x + 0.2*4*32, dy = c.fG.y - 0.2*4*16;
        ctx.fillStyle = '#0a0408';
        ctx.beginPath(); ctx.ellipse(dx, dy-5, 4, 6, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(dx-4, dy-5, 8, 5);
      }
    });

    // ── ACADEMY (Elara) — deep purple stone, blue glow ────────────────────
    this.makeBuilding('bld_academy', 4, 4, 104, {
      leftCol:0x20182e, rightCol:0x16101e, roofCol:0x100c18, roofTrim:0x4040a0,
      winCol:0x4060ff, stories:3,
      detail(ctx, c) {
        // Tower spire from roof center
        const mx = (c.fT.x+c.bT.x)/2, my = Math.min(c.lT.y,c.rT.y);
        ctx.fillStyle = '#181020';
        ctx.beginPath(); ctx.moveTo(mx, my-28); ctx.lineTo(mx-6, my); ctx.lineTo(mx+6, my); ctx.fill();
        ctx.fillStyle = 'rgba(80,100,255,0.35)';
        ctx.beginPath(); ctx.ellipse(mx, my-28, 4, 4, 0, 0, Math.PI*2); ctx.fill();
        // Moon window on upper left face
        const wx = c.fG.x + 0.5*4*32, wy = c.fG.y - 0.5*4*16 - 0.85*104;
        ctx.fillStyle = '#3050c0';
        ctx.beginPath(); ctx.arc(wx, wy-2, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#6080ff'; ctx.beginPath(); ctx.arc(wx, wy-2, 4, 0, Math.PI*2); ctx.fill();
      }
    });

    // ── TAVERN (Mira) — warm wood, amber windows ──────────────────────────
    this.makeBuilding('bld_tavern', 4, 4, 72, {
      leftCol:0x3e2a18, rightCol:0x2a1c0e, roofCol:0x241508, roofTrim:0x6a3818,
      winCol:0xffb030, stories:2,
      detail(ctx, c) {
        // Hanging sign
        const sx = c.fT.x + 0.15*4*32, sy = c.fT.y + 24;
        ctx.fillStyle = '#3a1e0a'; ctx.fillRect(sx-14, sy, 28, 14);
        ctx.strokeStyle = '#6a3818'; ctx.lineWidth = 1; ctx.strokeRect(sx-14, sy, 28, 14);
        ctx.fillStyle = '#d09030'; ctx.font = '5px monospace';
        ctx.fillText('TAVERN', sx-11, sy+9);
        // Sign post
        ctx.strokeStyle = '#2a1208'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx, c.fT.y+8); ctx.lineTo(sx, sy); ctx.stroke();
        // Barrel by door
        const bx = c.fG.x + 0.1*4*32 - 4, by = c.fG.y - 0.1*4*16;
        ctx.fillStyle = '#4a2a10'; ctx.fillRect(bx, by-10, 8, 10);
        ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 1;
        [by-3, by-7].forEach(y => { ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx+8, y); ctx.stroke(); });
      }
    });

    // ── CLOCKTOWER (Orin) — tall stone, lantern top ───────────────────────
    this.makeBuilding('bld_clocktower', 2, 2, 144, {
      leftCol:0x28222e, rightCol:0x1c1820, roofCol:0x141018, roofTrim:0x6a6080,
      winCol:0x90a0c0, stories:4,
      detail(ctx, c) {
        // Clock face on left face
        const cfx = c.fG.x + 0.5*2*32, cfy = c.fG.y - 0.5*2*16 - 0.75*144;
        ctx.fillStyle = '#0c0c14'; ctx.beginPath(); ctx.arc(cfx, cfy, 9, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#a090c0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cfx, cfy, 9, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = '#c0b0e0'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cfx, cfy); ctx.lineTo(cfx, cfy-6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cfx, cfy); ctx.lineTo(cfx+5, cfy); ctx.stroke();
        // Spire
        const sx = (c.fT.x+c.bT.x)/2, sy = Math.min(c.lT.y, c.rT.y);
        ctx.fillStyle = '#20181e';
        ctx.beginPath(); ctx.moveTo(sx, sy-36); ctx.lineTo(sx-5, sy); ctx.lineTo(sx+5, sy); ctx.fill();
        ctx.fillStyle = 'rgba(180,160,255,0.6)';
        ctx.beginPath(); ctx.arc(sx, sy-36, 3, 0, Math.PI*2); ctx.fill();
        // Battlements on roof
        for (let b = 0; b < 3; b++) {
          const t = (b+0.5)/3;
          const bx = c.fT.x + t*(c.lT.x-c.fT.x), by = c.fT.y + t*(c.lT.y-c.fT.y);
          ctx.fillStyle = '#1a1420'; ctx.fillRect(bx-2, by-5, 4, 5);
        }
      }
    });

    // ── SHRINE (Cael) — ember-glow, ornate ───────────────────────────────
    this.makeBuilding('bld_shrine', 4, 3, 72, {
      leftCol:0x2a1e1a, rightCol:0x1c1410, roofCol:0x180c08, roofTrim:0xff4010,
      winCol:0xff5010, stories:2,
      detail(ctx, c) {
        // Ember flame at roof peak
        const ex = (c.fT.x+c.bT.x)/2, ey = Math.min(c.lT.y, c.rT.y);
        ctx.fillStyle = 'rgba(255,80,10,0.7)';
        ctx.beginPath(); ctx.moveTo(ex, ey-16); ctx.lineTo(ex-5, ey); ctx.lineTo(ex+5, ey); ctx.fill();
        ctx.fillStyle = 'rgba(255,160,40,0.6)';
        ctx.beginPath(); ctx.moveTo(ex, ey-10); ctx.lineTo(ex-3, ey); ctx.lineTo(ex+3, ey); ctx.fill();
        // Arch window top left face
        const ax = c.fG.x + 0.5*4*32, ay = c.fG.y - 0.5*4*16 - 0.7*72;
        ctx.fillStyle = '#ff5010';
        ctx.beginPath(); ctx.arc(ax, ay-3, 5, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#ff8040'; ctx.fillRect(ax-5, ay-3, 10, 5);
      }
    });

    // ── GATEHOUSE (Joren) — heavy stone arch ─────────────────────────────
    this.makeBuilding('bld_gatehouse', 6, 3, 64, {
      leftCol:0x2a2428, rightCol:0x1c181e, roofCol:0x181418, roofTrim:0x504858,
      winCol:0x8090a0, stories:2,
      detail(ctx, c) {
        // Gate arch on left face
        const gx = c.fG.x + 0.5*6*32, gy = c.fG.y - 0.5*6*16;
        ctx.fillStyle = '#080408';
        ctx.beginPath(); ctx.arc(gx, gy-12, 10, Math.PI, 0); ctx.fill();
        ctx.fillRect(gx-10, gy-12, 20, 12);
        ctx.strokeStyle = '#3a3040'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(gx, gy-12, 10, Math.PI, 0); ctx.stroke();
        // Battlements
        for (let b = 0; b < 5; b++) {
          const t = (b+0.5)/5;
          const bx = c.fT.x + t*(c.lT.x-c.fT.x), by = c.fT.y + t*(c.lT.y-c.fT.y);
          ctx.fillStyle = '#181220'; ctx.fillRect(bx-2, by-6, 4, 6);
        }
        // Torches
        [0.2, 0.8].forEach(t => {
          const tx = c.fT.x + t*(c.lT.x-c.fT.x)+2, ty = c.fT.y + t*(c.lT.y-c.fT.y);
          ctx.fillStyle = '#5a3010'; ctx.fillRect(tx-1, ty, 2, 6);
          ctx.fillStyle = '#ff8020'; ctx.fillRect(tx-2, ty-4, 4, 4);
          ctx.fillStyle = 'rgba(255,160,40,0.4)';
          ctx.beginPath(); ctx.arc(tx, ty-4, 5, 0, Math.PI*2); ctx.fill();
        });
      }
    });

    // ── TAILOR (Theo) — green-trim wood ──────────────────────────────────
    this.makeBuilding('bld_tailor', 4, 4, 68, {
      leftCol:0x2e2418, rightCol:0x201810, roofCol:0x1c1008, roofTrim:0x405820,
      winCol:0xa0d060, stories:2,
      detail(ctx, c) {
        // Green awning
        const ax = c.fG.x + 0.5*4*32, ay = c.fG.y - 0.5*4*16 - 0.35*68;
        ctx.fillStyle = '#2a4010';
        ctx.beginPath(); ctx.moveTo(ax-18, ay-2); ctx.lineTo(ax+18, ay-2+(-3)); ctx.lineTo(ax+18, ay+6-3); ctx.lineTo(ax-18, ay+6); ctx.fill();
        ctx.strokeStyle = '#405820'; ctx.lineWidth = 0.5; ctx.stroke();
        // Mannequin silhouette in window
        const mx = c.fG.x + 0.5*4*32 - 4, my = c.fG.y - 0.5*4*16 - 0.6*68;
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(mx-2, my-6, 4, 8); // torso
        ctx.beginPath(); ctx.arc(mx, my-8, 3, 0, Math.PI*2); ctx.fill(); // head
      }
    });

    // ── APOTHECARY (Vesna) — green stone, herb glow ───────────────────────
    this.makeBuilding('bld_apothecary', 4, 4, 68, {
      leftCol:0x182820, rightCol:0x101c14, roofCol:0x0c140e, roofTrim:0x204820,
      winCol:0x40c060, stories:2,
      detail(ctx, c) {
        // Hanging herb bundles
        [0.25, 0.65].forEach(t => {
          const hx = c.fT.x + t*(c.lT.x-c.fT.x), hy = c.fT.y + t*(c.lT.y-c.fT.y) + 8;
          ctx.strokeStyle = '#2a4018'; ctx.lineWidth = 0.5;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.moveTo(hx+i*3-3, hy); ctx.lineTo(hx+i*3-2, hy+8); ctx.stroke();
          }
          ctx.fillStyle = '#204818'; ctx.fillRect(hx-4, hy-1, 8, 2);
        });
        // Green glow from door
        const dx = c.fG.x + 0.15*4*32, dy = c.fG.y - 0.15*4*16;
        ctx.fillStyle = 'rgba(60,180,80,0.2)';
        ctx.beginPath(); ctx.ellipse(dx, dy, 12, 6, 0, 0, Math.PI*2); ctx.fill();
      }
    });

    // ── Lantern post (standalone prop) ────────────────────────────────────
    {
      const ct = this.textures.createCanvas('prop_lantern_post', 16, 48);
      const el = ct!.getSourceImage() as HTMLCanvasElement;
      const ctx = el.getContext('2d')!;
      // Post
      ctx.fillStyle = '#2a1c10'; ctx.fillRect(7, 14, 3, 34);
      // Base
      ctx.fillStyle = '#1a1008'; ctx.fillRect(4, 42, 9, 6);
      // Lantern housing
      ctx.fillStyle = '#3a2818'; ctx.fillRect(4, 4, 9, 12);
      ctx.strokeStyle = '#5a4028'; ctx.lineWidth = 0.8; ctx.strokeRect(4, 4, 9, 12);
      // Glass pane glow
      ctx.fillStyle = '#ffc060'; ctx.fillRect(5, 5, 7, 10);
      // Flame center
      ctx.fillStyle = '#ffffff'; ctx.fillRect(7, 6, 3, 4);
      // Outer glow
      ctx.fillStyle = 'rgba(255,180,60,0.3)';
      ctx.beginPath(); ctx.arc(8, 10, 10, 0, Math.PI*2); ctx.fill();
      ct!.refresh();
    }
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.add.graphics();
  }

  // ── 3-faced isometric diamond ─────────────────────────────────────────────
  private diamond(
    gfx: Phaser.GameObjects.Graphics,
    topColor: number, leftColor: number, rightColor: number,
    w = TILE_W, h = TILE_H, sideH = 10
  ) {
    // Top face
    gfx.fillStyle(topColor, 1);
    gfx.fillPoints([
      { x: w / 2, y: 0 }, { x: w, y: h / 2 },
      { x: w / 2, y: h }, { x: 0, y: h / 2 },
    ], true);
    // Left face
    gfx.fillStyle(leftColor, 1);
    gfx.fillPoints([
      { x: 0, y: h / 2 }, { x: w / 2, y: h },
      { x: w / 2, y: h + sideH }, { x: 0, y: h / 2 + sideH },
    ], true);
    // Right face
    gfx.fillStyle(rightColor, 1);
    gfx.fillPoints([
      { x: w, y: h / 2 }, { x: w / 2, y: h },
      { x: w / 2, y: h + sideH }, { x: w, y: h / 2 + sideH },
    ], true);
    // Edge highlight on top-left rim
    gfx.lineStyle(1, Phaser.Display.Color.ValueToColor(topColor).lighten(15).color, 0.5);
    gfx.beginPath();
    gfx.moveTo(w / 2, 0); gfx.lineTo(0, h / 2);
    gfx.strokePath();
  }

  private generateTiles() {
    const tw = TILE_W, th = TILE_H, sh = 10;
    const total = th + sh;

    // ── Cobblestone ────────────────────────────────────────────────────────
    {
      const gfx = this.g();
      this.diamond(gfx, 0x6a5848, 0x3e2e22, 0x2e2018);
      // Mortar grid on top face
      gfx.lineStyle(1, 0x2e2018, 0.6);
      gfx.beginPath(); gfx.moveTo(tw*0.25, th*0.25); gfx.lineTo(tw*0.75, th*0.25); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(tw*0.25, th*0.75); gfx.lineTo(tw*0.75, th*0.75); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(tw*0.5, th*0.1); gfx.lineTo(tw*0.5, th*0.9); gfx.strokePath();
      // Stone highlights
      gfx.fillStyle(0x7a6858, 0.3);
      gfx.fillTriangle(tw*0.55, th*0.3, tw*0.7, th*0.4, tw*0.6, th*0.5);
      gfx.generateTexture('tile_cobble', tw, total);
      gfx.destroy();
    }
    // ── Path ────────────────────────────────────────────────────────────────
    {
      const gfx = this.g();
      this.diamond(gfx, 0x7a6650, 0x4e3e2e, 0x3a2e1e);
      gfx.lineStyle(1, 0x5a4a38, 0.4);
      gfx.beginPath(); gfx.moveTo(tw*0.3, th*0.35); gfx.lineTo(tw*0.7, th*0.35); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(tw*0.3, th*0.65); gfx.lineTo(tw*0.7, th*0.65); gfx.strokePath();
      gfx.generateTexture('tile_path', tw, total);
      gfx.destroy();
    }
    // ── Dirt ─────────────────────────────────────────────────────────────────
    {
      const gfx = this.g();
      this.diamond(gfx, 0x503820, 0x38240e, 0x28180a);
      gfx.generateTexture('tile_dirt', tw, total);
      gfx.destroy();
    }
    // ── Void ─────────────────────────────────────────────────────────────────
    {
      const gfx = this.g();
      gfx.fillStyle(0x060408, 1);
      gfx.fillRect(0, 0, tw, total);
      gfx.generateTexture('tile_void', tw, total);
      gfx.destroy();
    }
    // ── Ember plaza ──────────────────────────────────────────────────────────
    {
      const gfx = this.g();
      this.diamond(gfx, 0x7a4030, 0x4a2018, 0x38140c);
      // Glowing cracks
      gfx.lineStyle(1, 0xff6b35, 0.5);
      gfx.beginPath(); gfx.moveTo(tw*0.5, th*0.2); gfx.lineTo(tw*0.3, th*0.5); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(tw*0.5, th*0.8); gfx.lineTo(tw*0.7, th*0.5); gfx.strokePath();
      gfx.fillStyle(0xff8c42, 0.12);
      gfx.fillPoints([
        { x: tw/2, y: 0 }, { x: tw, y: th/2 },
        { x: tw/2, y: th }, { x: 0, y: th/2 },
      ], true);
      gfx.generateTexture('tile_ember', tw, total);
      gfx.destroy();
    }
    // ── Stone wall (taller block) ────────────────────────────────────────────
    {
      const gfx = this.g();
      const wh = 36; // wall height above ground
      // Front-left wall face
      gfx.fillStyle(0x4a3828, 1);
      gfx.fillRect(0, th/2, tw/2, wh);
      // Front-right wall face (darker)
      gfx.fillStyle(0x322418, 1);
      gfx.fillRect(tw/2, th/2, tw/2, wh);
      // Top face of wall
      gfx.fillStyle(0x6a5040, 1);
      gfx.fillPoints([
        { x: tw/2, y: 0 }, { x: tw, y: th/2 },
        { x: tw/2, y: th }, { x: 0, y: th/2 },
      ], true);
      // Top highlight
      gfx.lineStyle(1, 0x8a7060, 0.5);
      gfx.beginPath(); gfx.moveTo(tw/2, 0); gfx.lineTo(tw, th/2); gfx.strokePath();
      // Stone seam lines
      gfx.lineStyle(1, 0x1e1408, 0.4);
      gfx.beginPath(); gfx.moveTo(0, th/2+12); gfx.lineTo(tw/2, th/2+12); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(tw/2, th/2+12); gfx.lineTo(tw, th/2+12); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(0, th/2+24); gfx.lineTo(tw/2, th/2+24); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(tw/2, th/2+24); gfx.lineTo(tw, th/2+24); gfx.strokePath();
      gfx.generateTexture('tile_wall', tw, th + wh);
      gfx.destroy();
    }
    // ── Water ────────────────────────────────────────────────────────────────
    {
      const gfx = this.g();
      this.diamond(gfx, 0x0e1e38, 0x081018, 0x060c14);
      gfx.fillStyle(0x1a4a8a, 0.35);
      gfx.fillPoints([
        { x: tw/2, y: 4 }, { x: tw-4, y: th/2 },
        { x: tw/2, y: th-4 }, { x: 4, y: th/2 },
      ], true);
      gfx.lineStyle(1, 0x2a6ab0, 0.3);
      gfx.beginPath(); gfx.moveTo(tw*0.25, th*0.45); gfx.lineTo(tw*0.75, th*0.45); gfx.strokePath();
      gfx.generateTexture('tile_water', tw, total);
      gfx.destroy();
    }
  }

  // ── Player sprite sheet ───────────────────────────────────────────────────
  private generatePlayer() {
    // 20 wide × 28 tall, 4 directions × 4 frames
    const fw = 20, fh = 28;
    const DIRS = 4, FRAMES = 4;

    const canvas = this.textures.createCanvas('player', fw * FRAMES, fh * DIRS);
    const el = canvas!.getSourceImage() as HTMLCanvasElement;
    const ctx = el.getContext('2d')!;

    const px = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    };

    const drawFrame = (ox: number, oy: number, walkPhase: number, dir: number) => {
      // dir: 0=S, 1=W, 2=E, 3=N
      const bob = walkPhase > 0 ? (walkPhase % 2 === 0 ? 1 : -1) : 0;
      const by = oy + bob;

      // ── Cloak (back layer, visible S/W) ─────────────────────────────────
      const showCloak = dir === 0 || dir === 1;
      if (showCloak) {
        for (let cy = 10; cy < 22; cy++) {
          for (let cx = 5; cx < 16; cx++) {
            px(ox+cx, by+cy, cy < 16 ? '#3a1a4a' : '#2a1038');
          }
        }
        // cloak edge highlight
        for (let cy = 10; cy < 20; cy++) px(ox+5, by+cy, '#4a2858');
      }

      // ── Boots ────────────────────────────────────────────────────────────
      for (let r = 0; r < 4; r++) {
        for (let c = 4; c < 8; c++) px(ox+c, by+24+r, '#2a1810');
        for (let c = 12; c < 16; c++) px(ox+c, by+24+r, '#2a1810');
      }
      // boot highlight
      for (let c = 4; c < 8; c++) px(ox+c, by+24, '#3a2820');
      for (let c = 12; c < 16; c++) px(ox+c, by+24, '#3a2820');

      // ── Legs / bracers ───────────────────────────────────────────────────
      for (let r = 0; r < 6; r++) {
        for (let c = 4; c < 9; c++) px(ox+c, by+18+r, '#2a3050');
        for (let c = 11; c < 16; c++) px(ox+c, by+18+r, '#2a3050');
      }

      // ── Armor torso ──────────────────────────────────────────────────────
      // Main body
      for (let r = 0; r < 9; r++) {
        for (let c = 4; c < 16; c++) px(ox+c, by+9+r, '#7a4020');
      }
      // Chest plate (lighter center)
      for (let r = 0; r < 5; r++) {
        for (let c = 7; c < 13; c++) px(ox+c, by+10+r, '#8a5028');
      }
      // Armor highlight (top edge)
      for (let c = 4; c < 16; c++) px(ox+c, by+9, '#9a6030');
      // Armor shadow (bottom edge)
      for (let c = 4; c < 16; c++) px(ox+c, by+17, '#5a2e14');
      // Buckle
      px(ox+9, by+13, '#d0a040'); px(ox+10, by+13, '#d0a040');
      px(ox+9, by+14, '#d0a040'); px(ox+10, by+14, '#d0a040');

      // ── Arms ─────────────────────────────────────────────────────────────
      // Left arm
      for (let r = 0; r < 7; r++) {
        px(ox+2, by+10+r, '#6a3818');
        px(ox+3, by+10+r, '#6a3818');
      }
      // Right arm
      for (let r = 0; r < 7; r++) {
        px(ox+16, by+10+r, '#6a3818');
        px(ox+17, by+10+r, '#6a3818');
      }
      // Bracer (right arm lower, sword side)
      if (dir !== 1) { // not west-facing
        for (let r = 3; r < 7; r++) {
          px(ox+16, by+10+r, '#8a5830');
          px(ox+17, by+10+r, '#8a5830');
        }
      }

      // ── Neck/collar ──────────────────────────────────────────────────────
      for (let c = 8; c < 12; c++) px(ox+c, by+8, '#d0a878');
      for (let c = 8; c < 12; c++) px(ox+c, by+9, '#b08858');

      // ── Head ─────────────────────────────────────────────────────────────
      // Face skin
      for (let r = 0; r < 6; r++) {
        for (let c = 6; c < 14; c++) px(ox+c, by+2+r, '#dba878');
      }
      // Chin shadow
      for (let c = 7; c < 13; c++) px(ox+c, by+7, '#c09060');

      // ── Hair ─────────────────────────────────────────────────────────────
      for (let c = 5; c < 15; c++) px(ox+c, by+1, '#1e1008');
      for (let c = 5; c < 15; c++) px(ox+c, by+2, '#1e1008');
      for (let c = 5; c < 7; c++) { px(ox+c, by+3, '#1e1008'); px(ox+c, by+4, '#1e1008'); }
      if (dir === 1) { // west — side hair
        for (let r = 2; r < 6; r++) px(ox+13, by+r, '#1e1008');
        for (let r = 2; r < 5; r++) px(ox+14, by+r, '#1e1008');
      }
      if (dir === 2) { // east — side hair
        for (let r = 2; r < 6; r++) px(ox+6, by+r, '#1e1008');
        for (let r = 2; r < 5; r++) px(ox+5, by+r, '#1e1008');
      }

      // ── Eyes ─────────────────────────────────────────────────────────────
      if (dir === 0) { // south
        px(ox+8, by+5, '#1a1428'); px(ox+9, by+5, '#1a1428');
        px(ox+11, by+5, '#1a1428'); px(ox+12, by+5, '#1a1428');
        px(ox+8, by+4, '#ffffff'); px(ox+12, by+4, '#ffffff'); // eyes
      } else if (dir === 1) { // west
        px(ox+7, by+5, '#1a1428'); px(ox+8, by+5, '#1a1428');
      } else if (dir === 2) { // east
        px(ox+11, by+5, '#1a1428'); px(ox+12, by+5, '#1a1428');
      }
      // Scar (north / south)
      if (dir === 0 || dir === 3) {
        px(ox+10, by+4, '#c07050');
        px(ox+10, by+5, '#c07050');
      }

      // ── Sword (visible when facing S or E) ─────────────────────────────
      if (dir === 0 || dir === 2) {
        // Blade
        for (let r = 0; r < 10; r++) {
          px(ox+18, by+8+r, r < 2 ? '#e0f0f0' : '#a0c0d0');
        }
        // Guard
        px(ox+16, by+11, '#c09030'); px(ox+17, by+11, '#c09030');
        px(ox+18, by+11, '#c09030'); px(ox+19, by+11, '#c09030');
        // Grip
        for (let r = 0; r < 4; r++) px(ox+18, by+12+r, '#5a3010');
        // Pommel
        px(ox+17, by+16, '#c09030'); px(ox+18, by+16, '#c09030');
      }
    };

    for (let d = 0; d < DIRS; d++) {
      for (let f = 0; f < FRAMES; f++) {
        drawFrame(f * fw, d * fh, f, d);
      }
    }

    canvas!.refresh();

    const tex = this.textures.get('player');
    const dirs = ['s', 'w', 'e', 'n'];
    for (let d = 0; d < DIRS; d++) {
      const dir = dirs[d];
      tex.add(`idle_${dir}`,   0, 0,       d * fh, fw, fh);
      tex.add(`walk_${dir}_1`, 0, fw,      d * fh, fw, fh);
      tex.add(`walk_${dir}_2`, 0, fw * 2,  d * fh, fw, fh);
      tex.add(`walk_${dir}_3`, 0, fw * 3,  d * fh, fw, fh);
    }
  }

  // ── NPC sprites (16×24) ───────────────────────────────────────────────────
  private generateNPCs() {
    const configs = [
      { key: 'npc_baelor', skin:'#c08060', hair:'#4a2010', tunic:'#7a3820', apron:'#9a6030' },
      { key: 'npc_elara',  skin:'#d0b090', hair:'#8a7020', tunic:'#2a4080', robe:'#1a2860' },
      { key: 'npc_mira',   skin:'#c89070', hair:'#3a1818', tunic:'#6a3850', apron:'#8a5068' },
      { key: 'npc_theo',   skin:'#d8b888', hair:'#1a1408', tunic:'#486020', vest:'#304010' },
      { key: 'npc_orin',   skin:'#b09070', hair:'#a0a0b0', tunic:'#505870', robe:'#3a4060' },
      { key: 'npc_vesna',  skin:'#c8b090', hair:'#1a2818', tunic:'#2a6040', herb:'#3a8050' },
      { key: 'npc_cael',   skin:'#b08870', hair:'#080808', tunic:'#604820', robe:'#402e10' },
      { key: 'npc_joren',  skin:'#b08060', hair:'#202830', tunic:'#384860', armor:'#4a5878' },
    ];

    for (const cfg of configs) {
      const fw = 16, fh = 24;
      const c = this.textures.createCanvas(cfg.key, fw * 2, fh);
      const el = c!.getSourceImage() as HTMLCanvasElement;
      const ctx = el.getContext('2d')!;

      const px = (x: number, y: number, col: string) => {
        ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
      };

      for (let f = 0; f < 2; f++) {
        const ox = f * fw;
        const bob = f === 1 ? 1 : 0;

        // Boots
        for (let r = 0; r < 3; r++) {
          for (let cc = 3; cc < 7; cc++) px(ox+cc, bob+21+r, '#1e1008');
          for (let cc = 9; cc < 13; cc++) px(ox+cc, bob+21+r, '#1e1008');
        }
        // Legs
        for (let r = 0; r < 4; r++) {
          for (let cc = 3; cc < 7; cc++) px(ox+cc, bob+17+r, '#303848');
          for (let cc = 9; cc < 13; cc++) px(ox+cc, bob+17+r, '#303848');
        }
        // Tunic body
        for (let r = 0; r < 8; r++) {
          for (let cc = 2; cc < 14; cc++) px(ox+cc, bob+9+r, cfg.tunic);
        }
        // Arms (skin)
        for (let r = 0; r < 6; r++) {
          px(ox+1, bob+10+r, cfg.skin); px(ox+0, bob+10+r, cfg.skin);
          px(ox+14, bob+10+r, cfg.skin); px(ox+15, bob+10+r, cfg.skin);
        }
        // Neck
        for (let cc = 6; cc < 10; cc++) px(ox+cc, bob+8, cfg.skin);
        // Head
        for (let r = 0; r < 6; r++) {
          for (let cc = 4; cc < 12; cc++) px(ox+cc, bob+2+r, cfg.skin);
        }
        // Hair
        for (let cc = 3; cc < 13; cc++) px(ox+cc, bob+1, cfg.hair);
        for (let cc = 3; cc < 13; cc++) px(ox+cc, bob+2, cfg.hair);
        for (let cc = 3; cc < 5;  cc++) { px(ox+cc, bob+3, cfg.hair); px(ox+cc, bob+4, cfg.hair); }
        for (let cc = 11; cc < 13; cc++) { px(ox+cc, bob+3, cfg.hair); px(ox+cc, bob+4, cfg.hair); }
        // Eyes
        px(ox+5, bob+5, '#1a1428'); px(ox+6, bob+5, '#1a1428');
        px(ox+9, bob+5, '#1a1428'); px(ox+10, bob+5, '#1a1428');
      }
      c!.refresh();
    }
  }

  // ── UI elements ────────────────────────────────────────────────────────────
  private generateUI() {
    // HP bar fill (gradient red)
    { const g = this.g();
      g.fillStyle(0xc0392b, 1); g.fillRect(0, 0, 100, 8);
      g.fillStyle(0xe74c3c, 1); g.fillRect(0, 0, 100, 3);
      g.generateTexture('bar_hp', 100, 8); g.destroy(); }

    // Stamina bar (green)
    { const g = this.g();
      g.fillStyle(0x1a8040, 1); g.fillRect(0, 0, 100, 7);
      g.fillStyle(0x2ecc71, 1); g.fillRect(0, 0, 100, 2);
      g.generateTexture('bar_stamina', 100, 7); g.destroy(); }

    // Mana bar (blue)
    { const g = this.g();
      g.fillStyle(0x1a4090, 1); g.fillRect(0, 0, 100, 7);
      g.fillStyle(0x3498db, 1); g.fillRect(0, 0, 100, 2);
      g.generateTexture('bar_mana', 100, 7); g.destroy(); }

    // Bar track (dark inset)
    { const g = this.g();
      g.fillStyle(0x0c0810, 1); g.fillRect(0, 0, 100, 8);
      g.lineStyle(1, 0x2a1818, 1); g.strokeRect(0, 0, 100, 8);
      g.generateTexture('bar_bg', 100, 8); g.destroy(); }

    // Ember icon (glowing coin)
    { const g = this.g();
      g.fillStyle(0xc05010, 1); g.fillCircle(7, 7, 7);
      g.fillStyle(0xff8030, 1); g.fillCircle(7, 7, 5);
      g.fillStyle(0xffc060, 1); g.fillCircle(6, 6, 2);
      g.generateTexture('icon_ember', 14, 14); g.destroy(); }

    // Joystick base ring
    { const g = this.g();
      g.fillStyle(0x000000, 0.3); g.fillCircle(44, 44, 44);
      g.lineStyle(2, 0xff6b35, 0.5); g.strokeCircle(44, 44, 44);
      g.lineStyle(1, 0xff6b35, 0.2); g.strokeCircle(44, 44, 28);
      g.generateTexture('joystick_base', 88, 88); g.destroy(); }

    // Joystick thumb
    { const g = this.g();
      g.fillStyle(0xff6b35, 0.75); g.fillCircle(24, 24, 24);
      g.fillStyle(0xffa060, 0.5); g.fillCircle(20, 20, 12);
      g.lineStyle(1.5, 0xffd090, 0.4); g.strokeCircle(24, 24, 24);
      g.generateTexture('joystick_thumb', 48, 48); g.destroy(); }

    // Attack button
    { const g = this.g();
      g.fillStyle(0x8a2010, 0.7); g.fillCircle(26, 26, 26);
      g.lineStyle(2, 0xff4020, 0.9); g.strokeCircle(26, 26, 26);
      g.fillStyle(0xff6030, 0.9);
      // Sword icon
      g.fillRect(22, 12, 3, 18); // blade
      g.fillRect(17, 22, 13, 3); // guard
      g.fillRect(23, 28, 2, 5); // grip
      g.generateTexture('btn_attack', 52, 52); g.destroy(); }

    // Interact button  
    { const g = this.g();
      g.fillStyle(0x103860, 0.7); g.fillCircle(20, 20, 20);
      g.lineStyle(2, 0x4090d0, 0.9); g.strokeCircle(20, 20, 20);
      g.generateTexture('btn_interact', 40, 40); g.destroy(); }

    // Light radial
    { const g = this.g();
      for (let i = 16; i >= 0; i--) {
        g.fillStyle(0xffc060, (i / 16) * 0.55);
        g.fillCircle(56, 56, (i / 16) * 56);
      }
      g.generateTexture('light_radial', 112, 112); g.destroy(); }

    // Entity shadow
    { const g = this.g();
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(18, 6, 32, 10);
      g.generateTexture('entity_shadow', 36, 12); g.destroy(); }
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  private generateParticles() {
    { const g = this.g();
      g.fillStyle(0xff8030, 1); g.fillRect(0, 0, 3, 3);
      g.generateTexture('particle_ember', 3, 3); g.destroy(); }

    { const g = this.g();
      g.fillStyle(0x6a7a90, 0.45); g.fillCircle(5, 5, 5);
      g.generateTexture('particle_smoke', 10, 10); g.destroy(); }

    { const g = this.g();
      g.fillStyle(0xff6030, 1); g.fillRect(0, 0, 4, 4);
      g.fillStyle(0xffb060, 1); g.fillRect(1, 1, 2, 2);
      g.generateTexture('particle_portal', 4, 4); g.destroy(); }
  }

  // ── Props ─────────────────────────────────────────────────────────────────
  private generateProps() {
    // Portal pillar
    { const g = this.g();
      g.fillStyle(0x5a4030, 1); g.fillRect(6, 30, 20, 20);
      g.fillStyle(0x7a5840, 1); g.fillRect(8, 8, 16, 24);
      g.fillStyle(0xff4800, 0.9); g.fillRect(13, 4, 6, 30);
      g.fillStyle(0xff8030, 0.7); g.fillRect(14, 2, 4, 10);
      g.fillStyle(0xffc060, 1); g.fillRect(15, 0, 2, 6);
      g.generateTexture('prop_portal_piece', 32, 52); g.destroy(); }

    // Campfire
    { const g = this.g();
      g.fillStyle(0x4a2808, 1); g.fillRect(2, 12, 14, 5);
      g.fillStyle(0x3a1a04, 1); g.fillRect(5, 10, 8, 7);
      g.fillStyle(0xff4800, 0.9); g.fillTriangle(9, 2, 5, 12, 13, 12);
      g.fillStyle(0xff8030, 0.8); g.fillTriangle(9, 4, 6, 11, 12, 11);
      g.fillStyle(0xffc060, 1);  g.fillTriangle(9, 6, 7, 11, 11, 11);
      g.generateTexture('prop_campfire', 18, 18); g.destroy(); }

    // Lantern post
    { const g = this.g();
      g.fillStyle(0x3a2810, 1); g.fillRect(6, 8, 4, 28);
      g.fillStyle(0x2a1c0c, 1); g.fillRect(3, 2, 10, 10);
      g.lineStyle(1, 0x5a4020, 1); g.strokeRect(3, 2, 10, 10);
      g.fillStyle(0xffb840, 0.85); g.fillRect(5, 4, 6, 6);
      g.generateTexture('prop_lantern', 16, 36); g.destroy(); }

    // Chest
    { const g = this.g();
      g.fillStyle(0x6a4018, 1); g.fillRect(0, 8, 22, 14);
      g.fillStyle(0x4a2808, 1); g.fillRect(0, 6, 22, 4);
      g.fillStyle(0xd0a030, 1);
      g.fillRect(9, 12, 4, 4); g.lineStyle(1, 0x8a6010, 1); g.strokeRect(9, 12, 4, 4);
      g.lineStyle(1, 0x3a1e08, 1); g.strokeRect(0, 6, 22, 16);
      g.generateTexture('prop_chest', 22, 22); g.destroy(); }
  }
}
