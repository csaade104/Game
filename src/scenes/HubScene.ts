import Phaser from 'phaser';
import { GAME_W, GAME_H, TILE_W, TILE_H, TILE_HALF_W, TILE_HALF_H, HUB_COLS, HUB_ROWS, DEPTH, CAM_LERP } from '../config';
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

interface NPCDef { key:string; name:string; col:number; row:number; greeting:string; }
const NPCS: NPCDef[] = [
  { key:'npc_baelor', name:'Baelor the Forger',  col:6,  row:5,  greeting:'"I forged this for my daughter. She went into the dark and never came back. The blade remembers her hand — it will learn yours."' },
  { key:'npc_elara',  name:'Elara the Scholar',  col:23, row:5,  greeting:'"The ember is not dying. It is being drained. Something below feeds on it. Find it. Stop it. That is your charge."' },
  { key:'npc_mira',   name:'Mira of the Lamp',   col:6,  row:13, greeting:'"I have kept this tavern open through two wars and a plague. I will keep it open through this too. Drink. You look pale."' },
  { key:'npc_orin',   name:'Orin the Timekeeper',col:23, row:13, greeting:'"Time is a circle, wanderer. We have been here before. We will be here again. The question is whether we survive the loop."' },
  { key:'npc_theo',   name:'Theo the Tailor',    col:6,  row:19, greeting:'"A fine cloak on a wanderer is not vanity. It is armor for the soul. Let the dark see you and know you are not afraid."' },
  { key:'npc_vesna',  name:'Vesna the Herbalist', col:23, row:19, greeting:'"My herbs grow strange in the dark now. But strange is not useless. The draught I make from them burns like ember-fire in the blood."' },
  { key:'npc_cael',   name:'Brother Cael',        col:15, row:25, greeting:'"The Flame asks only one thing: do not let it go out. Everything else — your life, your fear, your past — is secondary."' },
  { key:'npc_joren',  name:'Captain Joren',       col:15, row:3,  greeting:'"The wall holds. The gate holds. But for how long? Every night the dark presses closer. Go below. Find the source. End this."' },
];

export class HubScene extends Phaser.Scene {
  private player!: Player;
  private inputMgr!: InputManager;
  private groundRT!: Phaser.GameObjects.RenderTexture;
  private npcSprites: Array<{ sprite: Phaser.GameObjects.Image; data: NPCDef }> = [];
  private portalGlow!: Phaser.GameObjects.Image;
  private portalTime = 0;
  private mapW = 0; private mapH = 0;
  private mapOX = 0; private mapOY = 0;
  // Dialogue banner
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerSpeaker!: Phaser.GameObjects.Text;
  private nearNPC: NPCDef | null = null;
  private bannerTimer = 0;
  // Intro
  private introActive = true;
  private introContainer!: Phaser.GameObjects.Container;
  // Joystick
  private joyBase!: Phaser.GameObjects.Image;
  private joyThumb!: Phaser.GameObjects.Image;
  private joyBaseX = 60; private joyBaseY = 0;
  private joyPointerID = -1;
  private atkBtn!: Phaser.GameObjects.Image;
  private itrBtn!: Phaser.GameObjects.Image;

  constructor() { super('HubScene'); }

  create() {
    this.mapW = (HUB_COLS + HUB_ROWS) * TILE_HALF_W;
    this.mapH = (HUB_COLS + HUB_ROWS) * TILE_HALF_H;
    this.mapOX = -(this.mapW / 2) + TILE_HALF_W;
    this.mapOY = -(this.mapH / 4);
    this.joyBaseY = this.scale.height - 60;

    this.cameras.main.setBounds(
      this.mapOX - GAME_W / 2, this.mapOY - this.scale.height / 2,
      this.mapW + GAME_W, this.mapH + GAME_H
    );
    this.cameras.main.setZoom(1.6);

    this.buildGround();
    this.buildPortal();
    this.buildNPCs();
    this.buildAtmosphere();

    const startCol = 15, startRow = 17;
    this.player = new Player(this, startCol, startRow);
    this.player.setCollisionMap(MAP, HUB_COLS, HUB_ROWS);
    this.syncPlayerPos();

    this.cameras.main.startFollow(this.player, true, CAM_LERP, CAM_LERP);

    this.inputMgr = new InputManager(this);
    this.buildJoystick();
    this.buildDialogueBanner();
    this.buildIntro();

    // Emit portal particles
    const ps = this.isoToScene(14, 10);
    this.add.particles(ps.x, ps.y, 'particle_ember', {
      speed: { min: 8, max: 22 }, angle: { min: 255, max: 285 },
      lifespan: { min: 1200, max: 3000 }, scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 }, frequency: 150, quantity: 1,
      tint: [PALETTE.EMBER_BRIGHT, PALETTE.EMBER_MID, PALETTE.LANTERN],
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  // ── Coordinate helper ──────────────────────────────────────────────────────
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

  // ── Ground ─────────────────────────────────────────────────────────────────
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
      case T.WALL:   return 'tile_wall';
      case T.EMBER:  return 'tile_ember';
      case T.WATER:  return 'tile_water';
      default:       return 'tile_cobble';
    }
  }

  // ── Portal ─────────────────────────────────────────────────────────────────
  private buildPortal() {
    const p = this.isoToScene(14, 11);
    // Glow ring on ground
    const ring = this.add.graphics();
    ring.fillStyle(PALETTE.EMBER_MID, 0.08);
    ring.fillEllipse(p.x, p.y + 8, 80, 40);
    ring.setDepth(DEPTH.GROUND + 1);

    // Two side pillars
    for (let i = 0; i < 2; i++) {
      const pillar = this.add.image(p.x + (i === 0 ? -20 : 20), p.y - 18, 'prop_portal_piece')
        .setDepth(p.y + 10 + i).setScale(0.75);
      this.tweens.add({ targets: pillar, y: p.y - 22, duration: 2200 + i*400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    // Central light column
    this.portalGlow = this.add.image(p.x, p.y - 26, 'light_radial')
      .setDepth(p.y + 20)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.55)
      .setTint(PALETTE.EMBER_MID);
  }

  // ── NPCs ───────────────────────────────────────────────────────────────────
  private buildNPCs() {
    for (const def of NPCS) {
      const s = this.isoToScene(def.col, def.row);
      const sprite = this.add.image(s.x, s.y - 12, def.key, 0)
        .setScale(1.4).setDepth(depthOf(def.col, def.row) + 20);

      // Idle bob
      this.tweens.add({ targets: sprite, y: s.y - 16, duration: 1600 + Math.random()*500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      // Walk cycle
      this.time.addEvent({ delay: 850 + Math.random()*300, loop: true, callback: () => {
        sprite.setFrame(Number(sprite.frame.name) === 0 ? 1 : 0);
      }});

      // Name label
      this.add.text(s.x, s.y - 28, def.name, {
        fontFamily: 'monospace', fontSize: '5px', color: '#d0b898',
        backgroundColor: '#0a0608cc', padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(depthOf(def.col, def.row) + 21);

      this.npcSprites.push({ sprite, data: def });
    }
  }

  // ── Atmosphere ─────────────────────────────────────────────────────────────
  private buildAtmosphere() {
    // Night overlay
    const night = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.OVERLAY - 5);
    night.fillStyle(0x0d0a1a, 1);
    night.fillRect(0, 0, GAME_W, GAME_H);
    this.tweens.add({ targets: night, alpha: 0.25, duration: 10000, ease: 'Sine.InOut', yoyo: true, repeat: -1 });

    // Vignette edges
    const vig = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.OVERLAY - 4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 0.4, m = i * 7;
      vig.fillStyle(0x060408, a);
      vig.fillRect(0, 0, GAME_W, m);
      vig.fillRect(0, GAME_H - m, GAME_W, m);
      vig.fillRect(0, 0, m, GAME_H);
      vig.fillRect(GAME_W - m, 0, m, GAME_H);
    }
  }

  // ── Dialogue banner ────────────────────────────────────────────────────────
  private buildDialogueBanner() {
    this.banner = this.add.container(GAME_W / 2, GAME_H - 38).setScrollFactor(0).setDepth(DEPTH.DIALOGUE).setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x080508, 0.92); bg.fillRoundedRect(-148, -26, 296, 52, 4);
    bg.lineStyle(1.5, PALETTE.EMBER_MID, 0.8); bg.strokeRoundedRect(-148, -26, 296, 52, 4);
    bg.lineStyle(1, PALETTE.STONE_DARK, 0.4); bg.strokeRoundedRect(-146, -24, 292, 48, 3);
    this.banner.add(bg);

    this.bannerSpeaker = this.add.text(-136, -20, '', {
      fontFamily: 'monospace', fontSize: '6px', color: '#ff6b35', letterSpacing: 1,
    });
    this.banner.add(this.bannerSpeaker);

    this.bannerText = this.add.text(-136, -8, '', {
      fontFamily: 'monospace', fontSize: '6px', color: '#e8d5b0',
      wordWrap: { width: 272 }, lineSpacing: 2,
    });
    this.banner.add(this.bannerText);

    const hint = this.add.text(118, 20, '[E] Talk', {
      fontFamily: 'monospace', fontSize: '5px', color: '#5a4030',
    });
    this.banner.add(hint);
  }

  private showBanner(npc: NPCDef) {
    this.nearNPC = npc; this.bannerTimer = 5000;
    this.bannerSpeaker.setText(npc.name.toUpperCase());
    this.bannerText.setText(npc.greeting);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 1, duration: 180, ease: 'Sine.Out' });
  }

  private hideBanner() {
    this.nearNPC = null;
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, duration: 250 });
  }

  // ── Intro cutscene ────────────────────────────────────────────────────────
  private buildIntro() {
    this.introContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.DIALOGUE + 50);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 1);
    overlay.fillRect(0, 0, GAME_W, GAME_H);
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

    const textObj = this.add.text(GAME_W / 2, this.scale.height / 2 - 20, '', {
      fontFamily: 'monospace', fontSize: '7px', color: '#e8d5b0',
      align: 'center', wordWrap: { width: GAME_W - 60 }, lineSpacing: 4,
    }).setOrigin(0.5);
    this.introContainer.add(textObj);

    const skipText = this.add.text(GAME_W / 2, GAME_H - 24, 'TAP TO CONTINUE', {
      fontFamily: 'monospace', fontSize: '6px', color: '#ff6b35', alpha: 0,
    } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5);
    this.introContainer.add(skipText);

    // Typewriter reveal
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

    // Tap/click to dismiss
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

  // ── Inline joystick ────────────────────────────────────────────────────────
  private buildJoystick() {
    const JX = this.joyBaseX, JY = this.joyBaseY;

    this.joyBase = this.add.image(JX, JY, 'joystick_base')
      .setScrollFactor(0).setDepth(2000).setAlpha(0.75);
    this.joyThumb = this.add.image(JX, JY, 'joystick_thumb')
      .setScrollFactor(0).setDepth(2001).setAlpha(0.9);

    // Attack button (bottom-right)
    this.atkBtn = this.add.image(this.scale.width - 48, this.scale.height - 48, 'btn_attack')
      .setScrollFactor(0).setDepth(2000).setAlpha(0.85);
    this.add.text(this.scale.width - 48, this.scale.height - 70, 'ATTACK', {
      fontFamily: 'monospace', fontSize: '5px', color: '#ff6b35',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0.7);

    // Interact button
    this.itrBtn = this.add.image(this.scale.width - 95, this.scale.height - 40, 'btn_interact')
      .setScrollFactor(0).setDepth(2000).setAlpha(0.85);
    this.add.text(this.scale.width - 95, this.scale.height - 60, 'TALK', {
      fontFamily: 'monospace', fontSize: '5px', color: '#6ab0e8',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0.7);

    const JR = 38; // max radius

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Joystick zone: left 45% of screen
      if (p.x < this.scale.width * 0.45 && this.joyPointerID === -1) {
        this.joyPointerID = p.id;
      }
      // Attack button zone: right side, bottom
      if (p.x > this.scale.width * 0.55 && p.y > this.scale.height * 0.55) {
        if (p.x > this.scale.width - 90) {
          this.inputMgr.joystickAttack = true;
          this.time.delayedCall(120, () => { this.inputMgr.joystickAttack = false; });
          this.tweens.add({ targets: this.atkBtn, scaleX: 0.85, scaleY: 0.85, duration: 80, yoyo: true });
        } else {
          this.inputMgr.joystickInteract = true;
          this.time.delayedCall(120, () => { this.inputMgr.joystickInteract = false; });
          this.tweens.add({ targets: this.itrBtn, scaleX: 0.85, scaleY: 0.85, duration: 80, yoyo: true });
        }
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joyPointerID) return;
      const dx = p.x - JX, dy = p.y - JY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const clamped = Math.min(dist, JR);
      const angle = Math.atan2(dy, dx);
      this.joyThumb.setPosition(JX + Math.cos(angle)*clamped, JY + Math.sin(angle)*clamped);
      const norm = Math.min(dist / JR, 1);
      this.inputMgr.joystickDX = Math.cos(angle) * norm;
      this.inputMgr.joystickDY = Math.sin(angle) * norm;
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyPointerID) {
        this.joyPointerID = -1;
        this.joyThumb.setPosition(JX, JY);
        this.inputMgr.joystickDX = 0;
        this.inputMgr.joystickDY = 0;
      }
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    this.portalTime += delta / 1000;

    // Portal pulse
    this.portalGlow.setAlpha(0.45 + Math.sin(this.portalTime * 2.4) * 0.28);
    this.portalGlow.setScale(0.48 + Math.sin(this.portalTime * 1.7) * 0.07);

    // Block movement during intro
    if (this.introActive) {
      this.events.emit('update-stats', this.player.playerStats);
      return;
    }

    // Input → player
    const inp = this.inputMgr.getState();
    this.player.setVelocity(inp.worldDX, inp.worldDY);
    this.player.update(delta);
    this.syncPlayerPos();

    // NPC proximity
    const px = this.player.worldX, py = this.player.worldY;
    let nearest: NPCDef | null = null, nearDist = 3.2;
    for (const n of this.npcSprites) {
      const d = Math.hypot(px - n.data.col, py - n.data.row);
      if (d < nearDist) { nearDist = d; nearest = n.data; }
    }
    if (nearest && this.nearNPC !== nearest) this.showBanner(nearest);
    else if (!nearest && this.nearNPC) this.hideBanner();

    if (this.nearNPC) {
      this.bannerTimer -= delta;
      if (this.bannerTimer <= 0) this.hideBanner();
    }

    this.events.emit('update-stats', this.player.playerStats);
  }
}
