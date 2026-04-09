import Phaser from 'phaser';
import { DEPTH } from '../config';
import { PALETTE } from '../utils/ColorPalette';
import { pulse } from '../utils/Easing';
import { HubScene, DialogueData, ShopOpenData } from './HubScene';
import { InputManager } from '../systems/InputManager';

interface Stats {
  hp: number; maxHp: number;
  stamina: number; maxStamina: number;
  mana: number; maxMana: number;
  level: number; xp: number; embers: number;
}

export class UIScene extends Phaser.Scene {
  // HUD bars
  private hpBar!: Phaser.GameObjects.Rectangle;
  private stBar!: Phaser.GameObjects.Rectangle;
  private mpBar!: Phaser.GameObjects.Rectangle;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private levelText!: Phaser.GameObjects.Text;
  private emberText!: Phaser.GameObjects.Text;
  private emberGlow!: Phaser.GameObjects.Image;
  private uiTime = 0;
  // Joystick
  private joyBase!: Phaser.GameObjects.Image;
  private joyThumb!: Phaser.GameObjects.Image;
  private atkBtn!: Phaser.GameObjects.Image;
  private itrBtn!: Phaser.GameObjects.Image;
  private joyPointerID = -1;
  // Active game scene binding
  private hub!: HubScene;
  private boundScene: Phaser.Scene | null = null;
  private boundSceneEvents: Phaser.Events.EventEmitter | null = null;
  public inputTarget: InputManager | null = null;
  // Dialogue
  private dialogueBox!: Phaser.GameObjects.Container;
  private dlgSpeaker!: Phaser.GameObjects.Text;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgPortrait!: Phaser.GameObjects.Image;
  private dlgNextBtn!: Phaser.GameObjects.Text;
  private dlgLineIdx = 0;
  private dlgLines: string[] = [];
  private dlgOpen = false;
  // NPC prompt
  private npcPrompt!: Phaser.GameObjects.Container;
  private npcPromptName!: Phaser.GameObjects.Text;
  private nearNPCData: DialogueData | null = null;
  // Portal UI
  private portalPromptUI!: Phaser.GameObjects.Container;
  private portalOverlayUI!: Phaser.GameObjects.Container;
  // Dungeon exit prompt
  private exitPromptUI!: Phaser.GameObjects.Container;
  private dungeonDepthText!: Phaser.GameObjects.Text;
  // Shop
  private shopBox!: Phaser.GameObjects.Container;
  private shopItemsArea!: Phaser.GameObjects.Container;
  private shopPortrait!: Phaser.GameObjects.Image;
  private shopNPCName!: Phaser.GameObjects.Text;
  private shopEmberCounter!: Phaser.GameObjects.Text;
  private shopData: ShopOpenData | null = null;
  // Level-up
  private lastLevel = 1;

  constructor() { super({ key: 'UIScene', active: false }); }

  create() {
    this.buildHUD();
    this.hub = this.scene.get('HubScene') as HubScene;

    this.buildJoystick();
    this.buildNPCPrompt();
    this.buildDialogueBox();
    this.buildPortalUI();
    this.buildExitPrompt();
    this.buildDungeonDepthIndicator();
    this.buildShopUI();
    this.buildControlsHint();

    // E key advances open dialogue
    this.input.keyboard?.on('keydown-E', () => {
      if (this.dlgOpen) this.advanceDialogue();
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  /** Called by HubScene and DungeonScene when they become active. */
  public bindToScene(scene: Phaser.Scene) {
    // Remove old listeners
    if (this.boundSceneEvents) {
      this.boundSceneEvents.off('update-stats');
      this.boundSceneEvents.off('npc-nearby');
      this.boundSceneEvents.off('open-dialogue');
      this.boundSceneEvents.off('portal-prompt');
      this.boundSceneEvents.off('portal-enter');
      this.boundSceneEvents.off('portal-exit');
      this.boundSceneEvents.off('exit-prompt');
    }
    this.boundScene = scene;
    this.boundSceneEvents = scene.events;
    if ((scene as any).inputMgr) this.inputTarget = (scene as any).inputMgr as InputManager;
    if (scene.scene.key === 'HubScene') this.hub = scene as HubScene;

    scene.events.on('update-stats', (s: Stats) => this.updateBars(s));
    scene.events.on('npc-nearby',   (d: DialogueData | null) => this.showNPCPrompt(d));
    scene.events.on('open-dialogue', (d: DialogueData) => this.openDialogue(d));
    scene.events.on('portal-prompt', (show: boolean) => this.showPortalPrompt(show));
    scene.events.on('portal-enter',  () => this.showPortalOverlay());
    scene.events.on('portal-exit',   () => this.hidePortalOverlay());
    scene.events.on('exit-prompt',   (show: boolean) => this.showExitPrompt(show));
    scene.events.on('open-shop',     (d: ShopOpenData) => this.openShop(d));

    // Show/hide dungeon depth indicator
    const inDungeon = scene.scene.key === 'DungeonScene';
    const depth = this.game.registry.get('dungeonDepth') ?? 1;
    if (this.dungeonDepthText) {
      this.dungeonDepthText.setText(`DEPTH ${depth}`).setVisible(inDungeon);
    }
    // Hide hub-specific elements in dungeon
    if (this.portalPromptUI) this.showPortalPrompt(false);
    if (this.npcPrompt) this.showNPCPrompt(null);
  }

  // ── Joystick ─────────────────────────────────────────────────────────────────
  private buildJoystick() {
    const SW = this.scale.width, SH = this.scale.height;
    const JR = 48;

    this.joyBase = this.add.image(SW * 0.2, SH * 0.75, 'joystick_base')
      .setDepth(DEPTH.HUD + 50).setAlpha(0);
    this.joyThumb = this.add.image(SW * 0.2, SH * 0.75, 'joystick_thumb')
      .setDepth(DEPTH.HUD + 51).setAlpha(0);

    this.atkBtn = this.add.image(SW - 60, SH - 62, 'btn_attack')
      .setDepth(DEPTH.HUD + 50).setAlpha(0.88);
    this.add.text(SW - 60, SH - 96, 'ATTACK', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ff6b35',
    }).setOrigin(0.5).setDepth(DEPTH.HUD + 50).setAlpha(0.9);

    this.itrBtn = this.add.image(SW - 128, SH - 52, 'btn_interact')
      .setDepth(DEPTH.HUD + 50).setAlpha(0.88);
    this.add.text(SW - 128, SH - 82, 'TALK/USE', {
      fontFamily: 'monospace', fontSize: '9px', color: '#6ab0e8',
    }).setOrigin(0.5).setDepth(DEPTH.HUD + 50).setAlpha(0.9);

    let activeX = 0, activeY = 0;
    const mgr = () => this.inputTarget;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.x < SW * 0.5 && this.joyPointerID === -1) {
        this.joyPointerID = p.id;
        activeX = p.x; activeY = p.y;
        this.joyBase.setPosition(p.x, p.y).setAlpha(0.72);
        this.joyThumb.setPosition(p.x, p.y).setAlpha(0.92);
      }
      if (p.x > SW * 0.5 && p.y > SH * 0.5) {
        const distAtk = Math.hypot(p.x - (SW - 60), p.y - (SH - 60));
        const distTalk = Math.hypot(p.x - (SW - 120), p.y - (SH - 50));
        if (distAtk < 48) {
          if (mgr()) { mgr()!.joystickAttack = true; this.time.delayedCall(130, () => { if (mgr()) mgr()!.joystickAttack = false; }); }
          this.tweens.add({ targets: this.atkBtn, scaleX: 0.82, scaleY: 0.82, duration: 80, yoyo: true });
        } else if (distTalk < 38) {
          if (this.dlgOpen) {
            this.advanceDialogue();
          } else if (this.nearNPCData && this.hub) {
            this.hub.dialogueOpen = true;
            this.openDialogue(this.nearNPCData);
          } else {
            if (mgr()) { mgr()!.joystickInteract = true; this.time.delayedCall(130, () => { if (mgr()) mgr()!.joystickInteract = false; }); }
          }
          this.tweens.add({ targets: this.itrBtn, scaleX: 0.82, scaleY: 0.82, duration: 80, yoyo: true });
        }
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joyPointerID) return;
      const dx = p.x - activeX, dy = p.y - activeY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const clamped = Math.min(dist, JR);
      this.joyThumb.setPosition(activeX + Math.cos(angle) * clamped, activeY + Math.sin(angle) * clamped);
      if (mgr()) {
        mgr()!.joystickDX = Math.cos(angle) * Math.min(dist / JR, 1);
        mgr()!.joystickDY = Math.sin(angle) * Math.min(dist / JR, 1);
      }
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joyPointerID) return;
      this.joyPointerID = -1;
      this.joyBase.setAlpha(0);
      this.joyThumb.setAlpha(0);
      if (mgr()) { mgr()!.joystickDX = 0; mgr()!.joystickDY = 0; }
    });
  }

  // ── HUD bars ──────────────────────────────────────────────────────────────────
  private buildHUD() {
    const pad = 10;
    const BAR_W = 120;
    const ICON_X = pad + 2;
    const BAR_X = pad + 20;

    const panelH = 80;
    const panel = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD);
    panel.fillStyle(0x080508, 0.88);
    panel.fillRoundedRect(pad - 6, pad - 6, BAR_W + 40, panelH, 5);
    panel.lineStyle(1.5, PALETTE.EMBER_MID, 0.75);
    panel.strokeRoundedRect(pad - 6, pad - 6, BAR_W + 40, panelH, 5);

    // HP
    this.add.text(ICON_X, pad + 1, '♥', { fontFamily: 'monospace', fontSize: '12px', color: '#e74c3c' })
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    this.addBarTrack(BAR_X, pad + 4, BAR_W, 11);
    this.hpBar = this.add.rectangle(BAR_X, pad + 4, BAR_W, 11, 0xc0392b)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);
    this.add.rectangle(BAR_X, pad + 4, BAR_W, 3, 0xe74c3c, 0.45)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 2);

    // Stamina
    this.add.text(ICON_X, pad + 19, '⚡', { fontFamily: 'monospace', fontSize: '10px', color: '#2ecc71' })
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    this.addBarTrack(BAR_X, pad + 20, BAR_W, 9);
    this.stBar = this.add.rectangle(BAR_X, pad + 20, BAR_W, 9, 0x1a8040)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    // Mana
    this.add.text(ICON_X, pad + 33, '✦', { fontFamily: 'monospace', fontSize: '10px', color: '#3498db' })
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    this.addBarTrack(BAR_X, pad + 34, BAR_W, 9);
    this.mpBar = this.add.rectangle(BAR_X, pad + 34, BAR_W, 9, 0x1a4090)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    // Level + XP
    this.levelText = this.add.text(ICON_X, pad + 48, 'LVL 1', {
      fontFamily: 'monospace', fontSize: '9px', color: '#ffd166',
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.addBarTrack(pad + 40, pad + 50, BAR_W - 12, 6);
    this.xpBar = this.add.rectangle(pad + 40, pad + 50, 0, 6, 0xffd166)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    // Embers (top-right)
    const ep = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD);
    ep.fillStyle(0x080508, 0.88);
    ep.fillRoundedRect(this.scale.width - 80, pad - 6, 74, 28, 5);
    ep.lineStyle(1.5, PALETTE.EMBER_DEEP, 0.75);
    ep.strokeRoundedRect(this.scale.width - 80, pad - 6, 74, 28, 5);

    this.emberGlow = this.add.image(this.scale.width - 68, pad + 8, 'icon_ember')
      .setScrollFactor(0).setDepth(DEPTH.HUD);

    this.emberText = this.add.text(this.scale.width - 52, pad + 1, '0', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffd166',
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.updateBars({ hp:100,maxHp:100,stamina:80,maxStamina:80,mana:60,maxMana:60,level:1,xp:0,embers:0 });
  }

  private addBarTrack(x: number, y: number, w: number, h: number) {
    this.add.rectangle(x, y, w, h, 0x0c0810).setOrigin(0, 0)
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    const border = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD);
    border.lineStyle(1, 0x2a1818, 0.8);
    border.strokeRect(x, y, w, h);
  }

  private updateBars(s: Stats) {
    const BAR_W = 120;
    this.hpBar.setSize(Math.max(1, BAR_W * Math.max(0, s.hp / s.maxHp)), 11);
    this.stBar.setSize(Math.max(1, BAR_W * Math.max(0, s.stamina / s.maxStamina)), 9);
    this.mpBar.setSize(Math.max(1, BAR_W * Math.max(0, s.mana / s.maxMana)), 9);
    this.xpBar.setSize(Math.max(0, (BAR_W - 12) * (s.xp / (s.level * 100))), 6);
    this.levelText.setText(`LVL ${s.level}`);
    this.emberText.setText(String(s.embers));
    // Refresh shop ember counter if open
    if (this.shopData && this.shopEmberCounter) {
      this.shopEmberCounter.setText(`${s.embers} ◆`);
    }
    // Level-up detection
    if (s.level > this.lastLevel) {
      this.lastLevel = s.level;
      this.showLevelUp(s.level);
    }
  }

  // ── NPC proximity prompt ──────────────────────────────────────────────────────
  private buildNPCPrompt() {
    const SW = this.scale.width, SH = this.scale.height;
    this.npcPrompt = this.add.container(SW / 2, SH * 0.72)
      .setDepth(DEPTH.HUD + 30).setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d0914, 0.92);
    bg.fillRoundedRect(-90, -16, 180, 32, 5);
    bg.lineStyle(1.5, PALETTE.EMBER_MID, 0.75);
    bg.strokeRoundedRect(-90, -16, 180, 32, 5);
    this.npcPrompt.add(bg);

    this.npcPromptName = this.add.text(0, -6, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#d0b898',
    }).setOrigin(0.5).setDepth(1);
    this.npcPrompt.add(this.npcPromptName);

    const hint = this.add.text(0, 6, '[E] / TAP TALK to speak', {
      fontFamily: 'monospace', fontSize: '8px', color: '#ff6b35',
    }).setOrigin(0.5).setDepth(1);
    this.npcPrompt.add(hint);

    // Tap prompt itself to open dialogue
    this.npcPrompt.setSize(180, 32).setInteractive();
    this.npcPrompt.on('pointerdown', () => {
      if (this.nearNPCData && this.hub) {
        this.hub.dialogueOpen = true;
        this.openDialogue(this.nearNPCData);
      }
    });
  }

  private showNPCPrompt(data: DialogueData | null) {
    this.nearNPCData = data;
    this.tweens.killTweensOf(this.npcPrompt);
    if (data) {
      this.npcPromptName.setText(data.name.toUpperCase());
      this.tweens.add({ targets: this.npcPrompt, alpha: 1, duration: 200, ease: 'Sine.Out' });
    } else {
      this.tweens.add({ targets: this.npcPrompt, alpha: 0, duration: 250 });
    }
  }

  // ── Full dialogue box ─────────────────────────────────────────────────────────
  private buildDialogueBox() {
    const SW = this.scale.width, SH = this.scale.height;
    const BW = Math.min(SW - 30, 780);
    const BH = Math.min(140, Math.max(110, SH * 0.35));
    // Position at bottom of screen
    this.dialogueBox = this.add.container(SW / 2, SH - BH / 2 - 8)
      .setDepth(DEPTH.DIALOGUE + 20).setAlpha(0);

    // Background dim above the box
    const dimH = SH - BH - 8;
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.55);
    dim.fillRect(-SW / 2, -SH / 2 + (BH / 2 + 8) - dimH, SW, dimH);
    this.dialogueBox.add(dim);

    // Box background
    const bg = this.add.graphics();
    bg.fillStyle(0x090613, 0.97);
    bg.fillRoundedRect(-BW / 2, -BH / 2, BW, BH, 6);
    bg.lineStyle(2, PALETTE.EMBER_DEEP, 0.9);
    bg.strokeRoundedRect(-BW / 2, -BH / 2, BW, BH, 6);
    bg.lineStyle(0.8, PALETTE.EMBER_MID, 0.25);
    bg.strokeRoundedRect(-BW / 2 + 4, -BH / 2 + 4, BW - 8, BH - 8, 4);
    this.dialogueBox.add(bg);

    // Portrait area
    const PW = 58, PP = 10;
    const portX = -BW / 2 + PP + PW / 2;
    const portBg = this.add.graphics();
    portBg.fillStyle(0x060410, 1);
    portBg.fillRoundedRect(portX - PW / 2, -BH / 2 + PP, PW, PW, 4);
    portBg.lineStyle(1.5, 0x2a1840, 0.8);
    portBg.strokeRoundedRect(portX - PW / 2, -BH / 2 + PP, PW, PW, 4);
    this.dialogueBox.add(portBg);

    this.dlgPortrait = this.add.image(portX, -BH / 2 + PP + PW / 2, 'npc_elara', 0)
      .setScale(2).setDepth(1);
    this.dialogueBox.add(this.dlgPortrait);

    // Text area (right of portrait)
    const TX = portX + PW / 2 + 14;        // text left edge (relative to container)
    const TR = BW / 2 - 14;                // text right edge (relative to container)
    const wrapW = TR - TX;

    this.dlgSpeaker = this.add.text(TX, -BH / 2 + 12, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ff7840', letterSpacing: 1,
    }).setDepth(1);
    this.dialogueBox.add(this.dlgSpeaker);

    this.dlgText = this.add.text(TX, -BH / 2 + 30, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#e8d5b0',
      wordWrap: { width: wrapW }, lineSpacing: 5,
    }).setDepth(1);
    this.dialogueBox.add(this.dlgText);

    // Navigation buttons
    this.dlgNextBtn = this.add.text(BW / 2 - 12, BH / 2 - 10, '▶ NEXT', {
      fontFamily: 'monospace', fontSize: '9px', color: '#ff6b35',
    }).setOrigin(1, 1).setDepth(1).setInteractive({ useHandCursor: true });
    this.dlgNextBtn.on('pointerdown', () => this.advanceDialogue());
    this.dlgNextBtn.on('pointerover', () => this.dlgNextBtn.setColor('#ffa060'));
    this.dlgNextBtn.on('pointerout',  () => this.dlgNextBtn.setColor('#ff6b35'));
    this.dialogueBox.add(this.dlgNextBtn);

    const closeBtn = this.add.text(-BW / 2 + 12, BH / 2 - 10, '✕ CLOSE', {
      fontFamily: 'monospace', fontSize: '9px', color: '#5a4030',
    }).setOrigin(0, 1).setDepth(1).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeDialogueUI());
    closeBtn.on('pointerover', () => closeBtn.setColor('#a06040'));
    closeBtn.on('pointerout',  () => closeBtn.setColor('#5a4030'));
    this.dialogueBox.add(closeBtn);

    // Line counter
    const lineCounter = this.add.text(BW / 2 - 48, BH / 2 - 10, '', {
      fontFamily: 'monospace', fontSize: '8px', color: '#3a2828',
    }).setOrigin(1, 1).setDepth(1).setName('lineCounter');
    this.dialogueBox.add(lineCounter);
  }

  private openDialogue(data: DialogueData) {
    if (this.dlgOpen) return;
    this.dlgOpen = true;
    this.dlgLines = data.lines;
    this.dlgLineIdx = 0;

    this.dlgPortrait.setTexture(data.key, 0);
    this.dlgSpeaker.setText(data.name.toUpperCase());
    this.dlgText.setText(data.lines[0] ?? '');

    const counter = this.dialogueBox.getByName('lineCounter') as Phaser.GameObjects.Text;
    if (counter) counter.setText(`${this.dlgLineIdx + 1}/${this.dlgLines.length}`);
    this.dlgNextBtn.setText(this.dlgLines.length > 1 ? '▶ NEXT' : '▶ DONE');

    this.tweens.killTweensOf(this.dialogueBox);
    this.tweens.add({ targets: this.dialogueBox, alpha: 1, duration: 180, ease: 'Sine.Out' });
    // Hide NPC prompt while dialogue is open
    this.tweens.add({ targets: this.npcPrompt, alpha: 0, duration: 100 });
  }

  private advanceDialogue() {
    if (!this.dlgOpen) return;
    this.dlgLineIdx++;
    if (this.dlgLineIdx >= this.dlgLines.length) {
      this.closeDialogueUI();
      return;
    }
    this.dlgText.setText(this.dlgLines[this.dlgLineIdx]);
    const counter = this.dialogueBox.getByName('lineCounter') as Phaser.GameObjects.Text;
    if (counter) counter.setText(`${this.dlgLineIdx + 1}/${this.dlgLines.length}`);
    this.dlgNextBtn.setText(this.dlgLineIdx + 1 >= this.dlgLines.length ? '▶ DONE' : '▶ NEXT');

    // Text flash
    this.dlgText.setAlpha(0.4);
    this.tweens.add({ targets: this.dlgText, alpha: 1, duration: 120 });
  }

  private closeDialogueUI() {
    if (!this.dlgOpen) return;
    this.dlgOpen = false;
    this.tweens.add({ targets: this.dialogueBox, alpha: 0, duration: 200 });
    if (this.hub) this.hub.closeDialogue();
    // Re-show NPC prompt if still nearby
    if (this.nearNPCData) {
      this.tweens.add({ targets: this.npcPrompt, alpha: 1, duration: 200 });
    }
  }

  // ── Portal UI ─────────────────────────────────────────────────────────────────
  private buildPortalUI() {
    const SW = this.scale.width, SH = this.scale.height;

    // Portal approach prompt
    this.portalPromptUI = this.add.container(SW / 2, SH * 0.6)
      .setDepth(DEPTH.HUD + 25).setAlpha(0);

    const ppBg = this.add.graphics();
    ppBg.fillStyle(0x0d0914, 0.92);
    ppBg.fillRoundedRect(-90, -17, 180, 34, 5);
    ppBg.lineStyle(1.5, PALETTE.EMBER_MID, 0.85);
    ppBg.strokeRoundedRect(-90, -17, 180, 34, 5);
    this.portalPromptUI.add(ppBg);

    const ppIcon = this.add.text(-70, 0, '⬇', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff6b35',
    }).setOrigin(0, 0.5).setDepth(1);
    this.portalPromptUI.add(ppIcon);

    const ppTxt = this.add.text(0, -5, 'DESCEND', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ff6b35', letterSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(1);
    this.portalPromptUI.add(ppTxt);

    const ppHint = this.add.text(0, 8, '[E] / TAP TALK', {
      fontFamily: 'monospace', fontSize: '8px', color: '#8a5030',
    }).setOrigin(0.5, 0).setDepth(1);
    this.portalPromptUI.add(ppHint);

    // Make portal prompt tappable
    this.portalPromptUI.setSize(180, 34).setInteractive();
    this.portalPromptUI.on('pointerdown', () => {
      if (this.inputTarget) {
        this.inputTarget.joystickInteract = true;
        this.time.delayedCall(130, () => { if (this.inputTarget) this.inputTarget.joystickInteract = false; });
      }
    });

    // Portal descend overlay (full screen)
    this.portalOverlayUI = this.add.container(SW / 2, SH / 2)
      .setDepth(DEPTH.DIALOGUE + 100).setAlpha(0);

    const poBg = this.add.graphics();
    poBg.fillStyle(0x000000, 1);
    poBg.fillRect(-SW / 2, -SH / 2, SW, SH);
    this.portalOverlayUI.add(poBg);

    const poGlow = this.add.graphics();
    poGlow.fillStyle(PALETTE.EMBER_MID, 0.08);
    poGlow.fillEllipse(0, 0, SW * 0.6, SH * 0.4);
    this.portalOverlayUI.add(poGlow);

    const poTitle = this.add.text(0, -22, '⬇  DESCENDING', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff6b35', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(1);
    this.portalOverlayUI.add(poTitle);

    const poSub = this.add.text(0, 8, 'The ember calls you downward...', {
      fontFamily: 'monospace', fontSize: '9px', color: '#6a4828',
    }).setOrigin(0.5).setDepth(1);
    this.portalOverlayUI.add(poSub);

    const poNote = this.add.text(0, 28, '[ Dungeon — Phase 3 ]', {
      fontFamily: 'monospace', fontSize: '8px', color: '#3a2418',
    }).setOrigin(0.5).setDepth(1);
    this.portalOverlayUI.add(poNote);
  }

  private showPortalPrompt(show: boolean) {
    this.tweens.killTweensOf(this.portalPromptUI);
    this.tweens.add({ targets: this.portalPromptUI, alpha: show ? 1 : 0, duration: 200 });
  }

  private showPortalOverlay() {
    this.tweens.add({ targets: this.portalOverlayUI, alpha: 1, duration: 900 });
  }

  private hidePortalOverlay() {
    this.tweens.add({ targets: this.portalOverlayUI, alpha: 0, duration: 700 });
  }

  // ── Exit prompt (dungeon ascend) ─────────────────────────────────────────────
  private buildExitPrompt() {
    const SW = this.scale.width, SH = this.scale.height;
    this.exitPromptUI = this.add.container(SW / 2, SH * 0.55)
      .setDepth(DEPTH.HUD + 25).setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d0914, 0.92);
    bg.fillRoundedRect(-95, -17, 190, 34, 5);
    bg.lineStyle(1.5, 0xff2010, 0.85);
    bg.strokeRoundedRect(-95, -17, 190, 34, 5);
    this.exitPromptUI.add(bg);

    const icon = this.add.text(-72, 0, '⬆', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff4020',
    }).setOrigin(0, 0.5).setDepth(1);
    this.exitPromptUI.add(icon);

    const txt = this.add.text(10, -5, 'ASCEND', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ff6b35', letterSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(1);
    this.exitPromptUI.add(txt);

    const hint = this.add.text(10, 8, '[E] / TAP TALK to ascend', {
      fontFamily: 'monospace', fontSize: '8px', color: '#8a5030',
    }).setOrigin(0.5, 0).setDepth(1);
    this.exitPromptUI.add(hint);

    this.exitPromptUI.setSize(190, 34).setInteractive();
    this.exitPromptUI.on('pointerdown', () => {
      if (this.inputTarget) {
        this.inputTarget.joystickInteract = true;
        this.time.delayedCall(130, () => { if (this.inputTarget) this.inputTarget.joystickInteract = false; });
      }
    });
  }

  private buildDungeonDepthIndicator() {
    const SW = this.scale.width;
    this.dungeonDepthText = this.add.text(SW / 2, 14, 'DEPTH 1', {
      fontFamily: 'monospace', fontSize: '9px', color: '#ff4020',
      stroke: '#000000', strokeThickness: 2, letterSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(DEPTH.HUD).setScrollFactor(0).setVisible(false);
  }

  private showExitPrompt(show: boolean) {
    if (!this.exitPromptUI) return;
    this.tweens.killTweensOf(this.exitPromptUI);
    this.tweens.add({ targets: this.exitPromptUI, alpha: show ? 1 : 0, duration: 200 });
  }

  // ── Shop UI ──────────────────────────────────────────────────────────────────
  private buildShopUI() {
    const SW = this.scale.width, SH = this.scale.height;
    const BW = Math.min(SW - 24, 380);
    const BH = Math.min(SH - 30, 310);

    this.shopBox = this.add.container(SW / 2, SH / 2)
      .setDepth(DEPTH.DIALOGUE + 30).setAlpha(0);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x060410, 0.97);
    bg.fillRoundedRect(-BW / 2, -BH / 2, BW, BH, 7);
    bg.lineStyle(2, PALETTE.EMBER_DEEP, 0.9);
    bg.strokeRoundedRect(-BW / 2, -BH / 2, BW, BH, 7);
    bg.lineStyle(0.8, PALETTE.EMBER_MID, 0.2);
    bg.strokeRoundedRect(-BW / 2 + 4, -BH / 2 + 4, BW - 8, BH - 8, 5);
    this.shopBox.add(bg);

    // Header bar
    const hdr = this.add.graphics();
    hdr.fillStyle(PALETTE.EMBER_DEEP, 0.25);
    hdr.fillRoundedRect(-BW / 2, -BH / 2, BW, 48, { tl: 7, tr: 7, bl: 0, br: 0 });
    this.shopBox.add(hdr);

    // NPC portrait
    this.shopPortrait = this.add.image(-BW / 2 + 30, -BH / 2 + 24, 'npc_baelor', 0)
      .setScale(1.8).setDepth(1);
    this.shopBox.add(this.shopPortrait);

    // NPC name + title
    this.shopNPCName = this.add.text(-BW / 2 + 58, -BH / 2 + 10, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ff7840', letterSpacing: 1,
    }).setDepth(1);
    this.shopBox.add(this.shopNPCName);

    const tradeLabel = this.add.text(-BW / 2 + 58, -BH / 2 + 26, '— TRADE EMBERS —', {
      fontFamily: 'monospace', fontSize: '8px', color: '#6a4828',
    }).setDepth(1);
    this.shopBox.add(tradeLabel);

    // Ember counter (top right)
    this.shopEmberCounter = this.add.text(BW / 2 - 8, -BH / 2 + 28, '0 ◆', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffd060',
    }).setOrigin(1, 0.5).setDepth(1);
    this.shopBox.add(this.shopEmberCounter);

    // Items area (dynamic, rebuilt on each open)
    this.shopItemsArea = this.add.container(0, -BH / 2 + 62);
    this.shopBox.add(this.shopItemsArea);

    // Close button
    const closeBtn = this.add.text(BW / 2 - 10, BH / 2 - 10, '✕ CLOSE', {
      fontFamily: 'monospace', fontSize: '9px', color: '#5a4030',
    }).setOrigin(1, 1).setDepth(1).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeShopUI());
    closeBtn.on('pointerover', () => closeBtn.setColor('#c07040'));
    closeBtn.on('pointerout',  () => closeBtn.setColor('#5a4030'));
    this.shopBox.add(closeBtn);
  }

  private openShop(data: ShopOpenData) {
    this.shopData = data;
    this.shopNPCName.setText(data.name.toUpperCase());
    this.shopPortrait.setTexture(data.key, 0);
    this.shopEmberCounter.setText(`${this.emberText.text} ◆`);

    this.rebuildShopItems(data);

    this.tweens.killTweensOf(this.shopBox);
    this.tweens.add({ targets: this.shopBox, alpha: 1, duration: 200, ease: 'Sine.Out' });
    // Hide NPC proximity prompt
    this.tweens.add({ targets: this.npcPrompt, alpha: 0, duration: 100 });
  }

  private rebuildShopItems(data: ShopOpenData) {
    this.shopItemsArea.removeAll(true);
    const SW = this.scale.width;
    const BW = Math.min(SW - 24, 380);
    const itemH = 62;

    data.items.forEach((item, i) => {
      const yOff = i * itemH;
      const row = this.add.container(0, yOff);

      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x0c0820, 0.7);
      rowBg.fillRoundedRect(-BW / 2 + 10, 0, BW - 20, itemH - 6, 4);
      rowBg.lineStyle(1, 0x201838, 0.8);
      rowBg.strokeRoundedRect(-BW / 2 + 10, 0, BW - 20, itemH - 6, 4);
      row.add(rowBg);

      const label = this.add.text(-BW / 2 + 20, 8, item.label, {
        fontFamily: 'monospace', fontSize: '10px', color: '#e8c898',
      }).setDepth(1);
      row.add(label);

      const desc = this.add.text(-BW / 2 + 20, 24, item.desc, {
        fontFamily: 'monospace', fontSize: '8px', color: '#7a6850',
      }).setDepth(1);
      row.add(desc);

      const costTxt = this.add.text(BW / 2 - 80, 14, `${item.cost} ◆`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#ffd060',
      }).setOrigin(0, 0.5).setDepth(1);
      row.add(costTxt);

      const buyBtn = this.add.text(BW / 2 - 20, 28, '▶ BUY', {
        fontFamily: 'monospace', fontSize: '9px', color: '#ff6b35',
        backgroundColor: '#1a0c08', padding: { x: 6, y: 3 },
      }).setOrigin(1, 0.5).setDepth(1).setInteractive({ useHandCursor: true });

      buyBtn.on('pointerdown', () => {
        const success = item.apply();
        if (success) {
          this.tweens.add({ targets: buyBtn, alpha: 0.3, duration: 60, yoyo: true });
          this.rebuildShopItems(data); // refresh to show updated embers/affordability
        } else {
          buyBtn.setColor('#5a2010');
          this.time.delayedCall(350, () => buyBtn.setColor('#ff6b35'));
        }
      });
      buyBtn.on('pointerover', () => buyBtn.setColor('#ffa060'));
      buyBtn.on('pointerout',  () => buyBtn.setColor('#ff6b35'));
      row.add(buyBtn);

      this.shopItemsArea.add(row);
    });
  }

  private closeShopUI() {
    if (!this.shopData) return;
    const cb = this.shopData.onClose;
    this.shopData = null;
    this.tweens.add({ targets: this.shopBox, alpha: 0, duration: 180 });
    cb();
  }

  // ── Level-up visual ───────────────────────────────────────────────────────────
  private showLevelUp(level: number) {
    const SW = this.scale.width, SH = this.scale.height;
    const banner = this.add.container(SW / 2, SH / 2 - 40)
      .setDepth(DEPTH.DIALOGUE + 60);

    const bg = this.add.graphics();
    bg.fillStyle(0xffd060, 0.12);
    bg.fillRoundedRect(-125, -22, 250, 44, 6);
    bg.lineStyle(2, 0xffd060, 0.7);
    bg.strokeRoundedRect(-125, -22, 250, 44, 6);
    banner.add(bg);

    banner.add(this.add.text(0, -8, '✦  LEVEL UP  ✦', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffd060',
      stroke: '#000000', strokeThickness: 2, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(1));

    banner.add(this.add.text(0, 9, `NOW LEVEL ${level}  —  POWER GROWS`, {
      fontFamily: 'monospace', fontSize: '8px', color: '#c0a850',
    }).setOrigin(0.5).setDepth(1));

    banner.setAlpha(0);
    this.tweens.add({
      targets: banner, alpha: 1, y: SH / 2 - 55, duration: 300, ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1400, () => {
          this.tweens.add({
            targets: banner, alpha: 0, y: SH / 2 - 80, duration: 600,
            onComplete: () => banner.destroy(),
          });
        });
      },
    });
  }

  // ── Controls hint (mobile only, fades after 8s) ───────────────────────────────
  private buildControlsHint() {
    if (!this.sys.game.device.input.touch) return;
    const SW = this.scale.width, SH = this.scale.height;
    const hint = this.add.container(SW / 2, SH / 2 + 30).setDepth(DEPTH.HUD + 20).setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(-110, -12, 220, 24, 4);
    hint.add(bg);

    const txt = this.add.text(0, 0, 'LEFT HALF: MOVE   RIGHT: ATTACK / TALK', {
      fontFamily: 'monospace', fontSize: '8px', color: '#c0a880',
    }).setOrigin(0.5).setDepth(1);
    hint.add(txt);

    // Fade in after intro settles, then fade out
    this.time.delayedCall(3500, () => {
      this.tweens.add({
        targets: hint, alpha: 0.9, duration: 600,
        onComplete: () => {
          this.time.delayedCall(6000, () => {
            this.tweens.add({ targets: hint, alpha: 0, duration: 1200 });
          });
        },
      });
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  update(_t: number, delta: number) {
    this.uiTime += delta / 1000;
    this.emberGlow.setAlpha(0.8 + pulse(this.uiTime, 1.5) * 0.2);

    // Pulse NEXT button when dialogue is open
    if (this.dlgOpen) {
      const a = 0.75 + pulse(this.uiTime, 2) * 0.25;
      this.dlgNextBtn.setAlpha(a);
    }
  }
}
