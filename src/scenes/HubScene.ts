import Phaser from 'phaser';
import { TILE_W, TILE_H, TILE_HALF_W, TILE_HALF_H, HUB_COLS, HUB_ROWS, DEPTH, CAM_LERP } from '../config';
import { gridToScreen, depthOf } from '../utils/IsoMath';
import { PALETTE } from '../utils/ColorPalette';
import { Player } from '../entities/Player';
import { InputManager } from '../systems/InputManager';

const T = { VOID:0, COBBLE:1, PATH:2, DIRT:3, WALL:4, EMBER:5, WATER:6 } as const;

// prettier-ignore
const MAP: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,0],
  [0,0,3,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,3,0,0],
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

export interface DialogueData { name: string; key: string; lines: string[]; }
export interface ShopItemDef { label: string; desc: string; cost: number; apply: () => boolean; }
export interface ShopOpenData { name: string; key: string; items: ShopItemDef[]; onClose: () => void; }

interface NPCDef { key:string; name:string; col:number; row:number; lines:string[]; shopItems?: ShopItemDef[]; }
const NPCS: NPCDef[] = [
  { key:'npc_baelor', name:'Baelor the Forger', col:5, row:9,
    lines:[
      '"Steel takes time. So does the warrior who wields it. Come back when you\'ve learned patience."',
    ],
  },
  { key:'npc_elara', name:'Elara the Scholar', col:23, row:9, lines:[
    '"The ember is not dying. It is being drained. Something below feeds on it."',
    '"I\'ve traced the ley-lines. The drain originates beneath the plaza. You must descend."',
    '"Take the portal when you are ready. Find it. Stop it. That is your charge."',
  ]},
  { key:'npc_mira', name:'Mira of the Lamp', col:5, row:17, lines:[
    '"I have kept this tavern open through two wars and a plague. I will keep it open through this."',
    '"Drink. You look pale. Whatever you face below, face it with a full stomach."',
  ]},
  { key:'npc_orin', name:'Orin the Timekeeper', col:23, row:16, lines:[
    '"Time is a circle, wanderer. We have been here before. We will be here again."',
    '"The clock in the tower has been running backward for three weeks. That is new."',
    '"The question is whether we survive the loop. I am less certain about you."',
  ]},
  { key:'npc_theo', name:'Theo the Tailor', col:5, row:23, lines:[
    '"A fine cloak on a wanderer is not vanity. It is armor for the soul."',
    '"Let the dark see you and know you are not afraid. Come back — I have a commission for you."',
  ]},
  { key:'npc_vesna', name:'Vesna the Herbalist', col:23, row:23, lines:[
    '"My herbs grow strange in the dark now. But strange is not useless."',
    '"The draught I make from them burns like ember-fire in the blood. Take one."',
    '"Do not ask what is in it. You would not sleep tonight if I told you."',
  ]},
  { key:'npc_cael', name:'Brother Cael', col:15, row:26, lines:[
    '"The Flame asks only one thing: do not let it go out."',
    '"Everything else — your life, your fear, your past — is secondary to the Flame\'s continuation."',
    '"The shrine will shelter you when you return. I pray that you do."',
  ]},
  { key:'npc_joren', name:'Captain Joren', col:15, row:6, lines:[
    '"The wall holds. The gate holds. But for how long?"',
    '"Every night the dark presses closer. Something stirs below — I feel it in the stones."',
    '"Go below. Find the source. End this. We cannot hold much longer."',
  ]},
];

interface BldDef { key:string; col:number; row:number; W:number; D:number; H:number; }
const BUILDINGS: BldDef[] = [
  { key:'bld_forge',      col:4,  row:4,  W:4, D:4, H:80  },
  { key:'bld_academy',    col:21, row:4,  W:4, D:4, H:104 },
  { key:'bld_tavern',     col:4,  row:12, W:4, D:4, H:72  },
  { key:'bld_clocktower', col:22, row:13, W:2, D:2, H:144 },
  { key:'bld_tailor',     col:4,  row:18, W:4, D:4, H:68  },
  { key:'bld_apothecary', col:21, row:18, W:4, D:4, H:68  },
  { key:'bld_shrine',     col:13, row:23, W:4, D:3, H:72  },
  { key:'bld_gatehouse',  col:12, row:3,  W:6, D:3, H:64  },
];

export class HubScene extends Phaser.Scene {
  private player!: Player;
  public inputMgr!: InputManager;
  private groundRT!: Phaser.GameObjects.RenderTexture;
  private npcSprites: Array<{ sprite: Phaser.GameObjects.Image; data: NPCDef }> = [];
  private portalGlow!: Phaser.GameObjects.Image;
  private portalTime = 0;
  private mapW = 0; private mapH = 0;
  private mapOX = 0; private mapOY = 0;
  // State
  private nearNPC: NPCDef | null = null;
  public dialogueOpen = false;
  private nearPortal = false;
  private portalEntering = false;
  // Intro
  private introActive = true;
  private introContainer!: Phaser.GameObjects.Container;
  // Adaptive zoom
  public camZoom = 1.6;

  constructor() { super('HubScene'); }

  create() {
    this.mapW = (HUB_COLS + HUB_ROWS) * TILE_HALF_W;
    this.mapH = (HUB_COLS + HUB_ROWS) * TILE_HALF_H;
    this.mapOX = -(this.mapW / 2) + TILE_HALF_W;
    this.mapOY = -(this.mapH / 4);

    // Adaptive zoom: phone landscape (short height) gets lower zoom so more world is visible
    this.camZoom = Phaser.Math.Clamp(this.scale.height / 480, 0.65, 1.6);

    this.cameras.main.setBounds(
      this.mapOX - this.scale.width / 2, this.mapOY - this.scale.height / 2,
      this.mapW + this.scale.width, this.mapH + this.scale.height
    );
    this.cameras.main.setZoom(this.camZoom);

    this.buildGround();
    this.buildBuildings();
    this.buildLanterns();
    this.buildPortal();
    this.buildNPCs();
    this.buildAtmosphere();

    const startCol = 15, startRow = 17;
    this.player = new Player(this, startCol, startRow);
    this.player.setCollisionMap(MAP, HUB_COLS, HUB_ROWS);
    this.syncPlayerPos();

    this.cameras.main.startFollow(this.player, true, CAM_LERP, CAM_LERP);

    this.inputMgr = new InputManager(this);
    this.buildIntro();

    // Restore player stats if returning from dungeon
    const savedStats = this.game.registry.get('playerStats');
    if (savedStats) Object.assign(this.player.playerStats, savedStats);

    // Wire shop items (closures over player stats — must happen after player created)
    this.wireShops();

    // Bind UIScene events (also called when returning from dungeon)
    const ui = this.scene.get('UIScene') as any;
    if (ui?.bindToScene) ui.bindToScene(this);

    // Portal particles
    const ps = this.isoToScene(14, 10);
    this.add.particles(ps.x, ps.y, 'particle_ember', {
      speed: { min: 8, max: 22 }, angle: { min: 255, max: 285 },
      lifespan: { min: 1200, max: 3000 }, scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 }, frequency: 150, quantity: 1,
      tint: [PALETTE.EMBER_BRIGHT, PALETTE.EMBER_MID, PALETTE.LANTERN],
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  // ── Coordinate helpers ──────────────────────────────────────────────────────
  private isoToScene(col: number, row: number) {
    const s = gridToScreen(col, row);
    return { x: s.x + this.mapOX, y: s.y + this.mapOY };
  }

  private syncPlayerPos() {
    const s = this.isoToScene(this.player.worldX, this.player.worldY);
    this.player.x = s.x;
    this.player.y = s.y - 14;
    this.player.setDepth(depthOf(this.player.worldX, this.player.worldY) + 50);
  }

  // ── Ground ──────────────────────────────────────────────────────────────────
  private buildGround() {
    const rtW = this.mapW + TILE_W * 2;
    const rtH = this.mapH + TILE_H * 4;
    this.groundRT = this.add.renderTexture(this.mapOX - TILE_W, this.mapOY, rtW, rtH)
      .setOrigin(0, 0).setDepth(DEPTH.GROUND);

    for (let row = 0; row < HUB_ROWS; row++) {
      for (let col = 0; col < HUB_COLS; col++) {
        const id = MAP[row]?.[col] ?? 0;
        if (id === T.VOID) continue;
        const s = gridToScreen(col, row);
        const tx = s.x + TILE_W;
        const ty = s.y;
        this.groundRT.draw(this.tileKey(id), tx, ty);
      }
    }
  }

  private tileKey(id: number): string {
    switch(id) {
      case T.COBBLE: return 'tile_cobble';
      case T.PATH:   return 'tile_path';
      case T.DIRT:   return 'tile_dirt';
      case T.WALL:   return 'tile_cobble';
      case T.EMBER:  return 'tile_ember';
      case T.WATER:  return 'tile_water';
      default:       return 'tile_cobble';
    }
  }

  // ── Buildings ───────────────────────────────────────────────────────────────
  private buildBuildings() {
    const TW = TILE_HALF_W, TH = TILE_HALF_H;
    for (const b of BUILDINGS) {
      const front = this.isoToScene(b.col + b.W, b.row + b.D);
      const cw = (b.W + b.D) * TW;
      const padTop = (b.W + b.D) * TH + 6;
      const ch = padTop + b.H + 4;
      const img = this.add.image(front.x, front.y, b.key)
        .setOrigin(b.D * TW / cw, (padTop + b.H) / ch)
        .setDepth(depthOf(b.col + b.W, b.row + b.D));
      const shadow = this.add.graphics().setDepth(DEPTH.GROUND + 2);
      shadow.fillStyle(0x000000, 0.22);
      shadow.fillEllipse(front.x, front.y - 4, (b.W+b.D) * TW * 0.9, (b.W+b.D) * TH * 0.9);
      void img;
    }
  }

  // ── Lanterns ────────────────────────────────────────────────────────────────
  private buildLanterns() {
    const lanternPositions = [
      [8, 9],[8, 15],[8, 21],
      [20, 9],[20, 15],[20, 21],
      [14, 3],[16, 3],
      [14, 25],[16, 25],
      [11, 12],[11, 15],[17, 12],[17, 15],
    ];
    for (const [col, row] of lanternPositions) {
      const s = this.isoToScene(col, row);
      const post = this.add.image(s.x, s.y - 8, 'prop_lantern_post')
        .setDepth(depthOf(col, row) + 15).setScale(1.2);
      const glow = this.add.image(s.x, s.y - 30, 'light_radial')
        .setDepth(depthOf(col, row) + 14)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.35).setTint(0xffc060).setAlpha(0.55);
      this.tweens.add({ targets: glow, alpha: 0.3, scaleX: 0.32, scaleY: 0.32,
        duration: 1800 + Math.random()*600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.add.particles(s.x, s.y - 36, 'particle_ember', {
        speed: { min: 3, max: 8 }, angle: { min: 260, max: 280 },
        lifespan: { min: 600, max: 1400 }, scale: { start: 0.7, end: 0 },
        alpha: { start: 0.7, end: 0 }, frequency: 400, quantity: 1,
        tint: [0xffc060, 0xff9030], blendMode: Phaser.BlendModes.ADD,
      }).setDepth(depthOf(col, row) + 16);
      void post;
    }
  }

  // ── Portal ──────────────────────────────────────────────────────────────────
  private buildPortal() {
    const p = this.isoToScene(14, 11);
    const ring = this.add.graphics();
    ring.fillStyle(PALETTE.EMBER_MID, 0.08);
    ring.fillEllipse(p.x, p.y + 8, 80, 40);
    ring.setDepth(DEPTH.GROUND + 1);

    for (let i = 0; i < 2; i++) {
      const pillar = this.add.image(p.x + (i === 0 ? -20 : 20), p.y - 18, 'prop_portal_piece')
        .setDepth(p.y + 10 + i).setScale(0.75);
      this.tweens.add({ targets: pillar, y: p.y - 22, duration: 2200 + i*400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    this.portalGlow = this.add.image(p.x, p.y - 26, 'light_radial')
      .setDepth(p.y + 20)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.55)
      .setTint(PALETTE.EMBER_MID);
  }

  // ── NPCs ────────────────────────────────────────────────────────────────────
  private buildNPCs() {
    for (const def of NPCS) {
      const s = this.isoToScene(def.col, def.row);
      const sprite = this.add.image(s.x, s.y - 12, def.key, 0)
        .setScale(1.4).setDepth(depthOf(def.col, def.row) + 20);

      this.tweens.add({ targets: sprite, y: s.y - 16, duration: 1600 + Math.random()*500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.time.addEvent({ delay: 850 + Math.random()*300, loop: true, callback: () => {
        sprite.setFrame(Number(sprite.frame.name) === 0 ? 1 : 0);
      }});

      this.add.text(s.x, s.y - 34, def.name, {
        fontFamily: 'monospace', fontSize: '8px', color: '#d0b898',
        backgroundColor: '#0a0608cc', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(depthOf(def.col, def.row) + 21);

      this.npcSprites.push({ sprite, data: def });
    }
  }

  // ── Atmosphere ──────────────────────────────────────────────────────────────
  private buildAtmosphere() {
    const SW = this.scale.width, SH = this.scale.height;
    const cz = this.camZoom;
    // Divide by camZoom so scrollFactor(0) overlays cover the full screen
    const SWz = SW / cz, SHz = SH / cz;

    const night = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.OVERLAY - 5);
    night.fillStyle(0x0d0a1a, 1);
    night.fillRect(0, 0, SWz, SHz);
    this.tweens.add({ targets: night, alpha: 0.25, duration: 10000, ease: 'Sine.InOut', yoyo: true, repeat: -1 });

    const vig = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.OVERLAY - 4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 0.4, m = i * 7;
      vig.fillStyle(0x060408, a);
      vig.fillRect(0, 0, SWz, m);
      vig.fillRect(0, SHz - m, SWz, m);
      vig.fillRect(0, 0, m, SHz);
      vig.fillRect(SWz - m, 0, m, SHz);
    }
  }

  // ── Intro cutscene ───────────────────────────────────────────────────────────
  private buildIntro() {
    const SW = this.scale.width, SH = this.scale.height;
    const cz = this.camZoom;
    this.introContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.DIALOGUE + 50);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 1);
    overlay.fillRect(0, 0, SW / cz, SH / cz);
    this.introContainer.add(overlay);

    const lines = [
      'The ember fades.',
      'Emberhold — last city of men — faces the dark.',
      '',
      'You are Kaelen.',
      'Wanderer. Fighter. Heir to the Keeper\'s line.',
      '',
      'Scholar Elara has called you home.',
      'The Flame needs a champion.',
      'Descend. Rekindle it. Before everything ends.',
    ];

    const textObj = this.add.text(SW / (2 * cz), SH / (2 * cz) - 30, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#e8d5b0',
      align: 'center', wordWrap: { width: (SW - 80) / cz }, lineSpacing: 6,
    }).setOrigin(0.5);
    this.introContainer.add(textObj);

    const skipText = this.add.text(SW / (2 * cz), (SH - 30) / cz, 'TAP TO CONTINUE', {
      fontFamily: 'monospace', fontSize: '9px', color: '#ff6b35', alpha: 0,
    } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5);
    this.introContainer.add(skipText);

    let fullText = lines.join('\n');
    let shown = 0;
    const ticker = this.time.addEvent({
      delay: 35, loop: true, callback: () => {
        shown = Math.min(shown + 1, fullText.length);
        textObj.setText(fullText.substring(0, shown));
        if (shown >= fullText.length) {
          ticker.remove();
          this.tweens.add({ targets: skipText, alpha: 1, duration: 500 });
          this.tweens.add({ targets: skipText, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
        }
      },
    });

    const dismiss = () => {
      ticker.remove();
      this.introActive = false;
      this.tweens.add({
        targets: this.introContainer, alpha: 0, duration: 600,
        onComplete: () => this.introContainer.destroy(),
      });
    };

    this.input.once('pointerdown', dismiss);
    this.input.keyboard?.once('keydown', dismiss);
  }

  // ── Shop wiring ──────────────────────────────────────────────────────────────
  private wireShops() {
    const p = this.player.playerStats;
    const emit = () => this.events.emit('update-stats', p);

    const baelor = NPCS.find(n => n.key === 'npc_baelor')!;
    baelor.shopItems = [
      { label: 'Sharpen Blade', desc: '+4 Attack', cost: 15,
        apply: () => { if (p.embers < 15) return false; p.embers -= 15; p.attack += 4; emit(); return true; } },
      { label: 'Temper Armor', desc: '+2 Defense', cost: 12,
        apply: () => { if (p.embers < 12) return false; p.embers -= 12; p.defense += 2; emit(); return true; } },
      { label: 'Forge Endurance', desc: '+20 Max Stamina', cost: 18,
        apply: () => { if (p.embers < 18) return false; p.embers -= 18; p.maxStamina += 20; p.stamina = Math.min(p.stamina + 20, p.maxStamina); emit(); return true; } },
    ];

    const vesna = NPCS.find(n => n.key === 'npc_vesna')!;
    vesna.shopItems = [
      { label: 'Vitality Draught', desc: '+30 Max HP', cost: 20,
        apply: () => { if (p.embers < 20) return false; p.embers -= 20; p.maxHp += 30; p.hp = Math.min(p.hp + 30, p.maxHp); emit(); return true; } },
      { label: 'Ember Tincture', desc: 'Restore full HP', cost: 10,
        apply: () => { if (p.embers < 10) return false; p.embers -= 10; p.hp = p.maxHp; emit(); return true; } },
      { label: 'Mana Infusion', desc: '+20 Max Mana', cost: 14,
        apply: () => { if (p.embers < 14) return false; p.embers -= 14; p.maxMana += 20; p.mana = Math.min(p.mana + 20, p.maxMana); emit(); return true; } },
    ];
  }

  // ── Public methods for UIScene ───────────────────────────────────────────────
  public closeDialogue() {
    this.dialogueOpen = false;
  }

  // ── Portal enter animation ───────────────────────────────────────────────────
  private enterPortal() {
    if (this.portalEntering) return;
    this.portalEntering = true;
    this.dialogueOpen = true;
    // Save current player stats to registry for dungeon
    this.game.registry.set('playerStats', { ...this.player.playerStats });
    this.game.registry.set('dungeonDepth', this.game.registry.get('dungeonDepth') ?? 1);
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.events.emit('portal-exit'); // dismiss UI overlay
      this.scene.start('DungeonScene');
    });
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    this.portalTime += delta / 1000;
    this.portalGlow.setAlpha(0.45 + Math.sin(this.portalTime * 2.4) * 0.28);
    this.portalGlow.setScale(0.48 + Math.sin(this.portalTime * 1.7) * 0.07);

    if (this.introActive) {
      this.events.emit('update-stats', this.player.playerStats);
      return;
    }

    if (this.dialogueOpen) {
      this.events.emit('update-stats', this.player.playerStats);
      return;
    }

    const inp = this.inputMgr.getState();
    this.player.setVelocity(inp.worldDX, inp.worldDY);
    this.player.update(delta);
    this.syncPlayerPos();

    const px = this.player.worldX, py = this.player.worldY;

    // Portal proximity
    const portalDist = Math.hypot(px - 14, py - 11);
    const newNearPortal = portalDist < 2.5;
    if (newNearPortal !== this.nearPortal) {
      this.nearPortal = newNearPortal;
      this.events.emit('portal-prompt', newNearPortal);
    }

    // NPC proximity
    let nearest: NPCDef | null = null, nearDist = 2.8;
    for (const n of this.npcSprites) {
      const d = Math.hypot(px - n.data.col, py - n.data.row);
      if (d < nearDist) { nearDist = d; nearest = n.data; }
    }
    if (nearest !== this.nearNPC) {
      this.nearNPC = nearest;
      this.events.emit('npc-nearby', nearest
        ? { name: nearest.name, key: nearest.key, lines: nearest.lines } as DialogueData
        : null);
    }

    // Interaction
    if (inp.interact) {
      if (this.nearPortal) {
        this.enterPortal();
      } else if (this.nearNPC) {
        this.dialogueOpen = true;
        if (this.nearNPC.shopItems) {
          this.events.emit('open-shop', {
            name: this.nearNPC.name, key: this.nearNPC.key,
            items: this.nearNPC.shopItems,
            onClose: () => { this.dialogueOpen = false; },
          } as ShopOpenData);
        } else {
          this.events.emit('open-dialogue', {
            name: this.nearNPC.name, key: this.nearNPC.key, lines: this.nearNPC.lines,
          } as DialogueData);
        }
      }
    }

    this.events.emit('update-stats', this.player.playerStats);
  }
}
