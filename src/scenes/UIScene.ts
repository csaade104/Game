import Phaser from 'phaser';
import { DEPTH } from '../config';
import { PALETTE } from '../utils/ColorPalette';
import { pulse } from '../utils/Easing';
import { HubScene } from './HubScene';

interface Stats {
  hp: number; maxHp: number;
  stamina: number; maxStamina: number;
  mana: number; maxMana: number;
  level: number; xp: number; embers: number;
}

export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Rectangle;
  private stBar!: Phaser.GameObjects.Rectangle;
  private mpBar!: Phaser.GameObjects.Rectangle;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private levelText!: Phaser.GameObjects.Text;
  private emberText!: Phaser.GameObjects.Text;
  private emberGlow!: Phaser.GameObjects.Image;
  private uiTime = 0;
  // Joystick (in UIScene so camera zoom=1 → positions are true screen coords)
  private joyBase!: Phaser.GameObjects.Image;
  private joyThumb!: Phaser.GameObjects.Image;
  private atkBtn!: Phaser.GameObjects.Image;
  private itrBtn!: Phaser.GameObjects.Image;
  private joyPointerID = -1;

  constructor() { super({ key: 'UIScene', active: false }); }

  create() {
    this.buildHUD();
    const hub = this.scene.get('HubScene') as HubScene;
    if (hub) {
      hub.events.on('update-stats', (s: Stats) => this.updateBars(s));
      this.buildJoystick(hub);
    }
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private buildJoystick(hub: HubScene) {
    const SW = this.scale.width, SH = this.scale.height;
    const JR = 48; // max thumb radius

    // Floating joystick — hidden until user touches left half
    this.joyBase = this.add.image(SW * 0.2, SH * 0.75, 'joystick_base')
      .setDepth(DEPTH.HUD + 50).setAlpha(0);
    this.joyThumb = this.add.image(SW * 0.2, SH * 0.75, 'joystick_thumb')
      .setDepth(DEPTH.HUD + 51).setAlpha(0);

    // Right-side buttons
    this.atkBtn = this.add.image(SW - 60, SH - 60, 'btn_attack')
      .setDepth(DEPTH.HUD + 50).setAlpha(0.85);
    this.add.text(SW - 60, SH - 88, 'ATTACK', {
      fontFamily: 'monospace', fontSize: '6px', color: '#ff6b35',
    }).setOrigin(0.5).setDepth(DEPTH.HUD + 50).setAlpha(0.8);

    this.itrBtn = this.add.image(SW - 120, SH - 50, 'btn_interact')
      .setDepth(DEPTH.HUD + 50).setAlpha(0.85);
    this.add.text(SW - 120, SH - 76, 'TALK', {
      fontFamily: 'monospace', fontSize: '6px', color: '#6ab0e8',
    }).setOrigin(0.5).setDepth(DEPTH.HUD + 50).setAlpha(0.8);

    let activeX = 0, activeY = 0;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Left half → joystick
      if (p.x < SW * 0.5 && this.joyPointerID === -1) {
        this.joyPointerID = p.id;
        activeX = p.x; activeY = p.y;
        this.joyBase.setPosition(p.x, p.y).setAlpha(0.72);
        this.joyThumb.setPosition(p.x, p.y).setAlpha(0.92);
      }
      // Right half bottom → buttons
      if (p.x > SW * 0.5 && p.y > SH * 0.5) {
        const distAtk = Math.hypot(p.x - (SW - 60), p.y - (SH - 60));
        const distTalk = Math.hypot(p.x - (SW - 120), p.y - (SH - 50));
        if (distAtk < 48) {
          hub.inputMgr.joystickAttack = true;
          this.time.delayedCall(130, () => { hub.inputMgr.joystickAttack = false; });
          this.tweens.add({ targets: this.atkBtn, scaleX: 0.82, scaleY: 0.82, duration: 80, yoyo: true });
        } else if (distTalk < 38) {
          hub.inputMgr.joystickInteract = true;
          this.time.delayedCall(130, () => { hub.inputMgr.joystickInteract = false; });
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
      hub.inputMgr.joystickDX = Math.cos(angle) * Math.min(dist / JR, 1);
      hub.inputMgr.joystickDY = Math.sin(angle) * Math.min(dist / JR, 1);
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joyPointerID) return;
      this.joyPointerID = -1;
      this.joyBase.setAlpha(0);
      this.joyThumb.setAlpha(0);
      hub.inputMgr.joystickDX = 0;
      hub.inputMgr.joystickDY = 0;
    });
  }

  private buildHUD() {
    const pad = 10;
    const BAR_W = 110;

    // ── Left panel ────────────────────────────────────────────────────────
    const panel = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD);
    panel.fillStyle(0x080508, 0.82);
    panel.fillRoundedRect(pad - 4, pad - 4, BAR_W + 36, 64, 4);
    panel.lineStyle(1.5, PALETTE.EMBER_MID, 0.7);
    panel.strokeRoundedRect(pad - 4, pad - 4, BAR_W + 36, 64, 4);

    // HP
    this.add.text(pad, pad + 2, '♥', { fontFamily: 'monospace', fontSize: '9px', color: '#e74c3c' })
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    this.addBarTrack(pad + 14, pad + 3, BAR_W, 10);
    this.hpBar = this.add.rectangle(pad + 14, pad + 3, BAR_W, 10, 0xc0392b)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);
    // HP shimmer
    this.add.rectangle(pad + 14, pad + 3, BAR_W, 3, 0xe74c3c, 0.5)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 2);

    // Stamina
    this.add.text(pad, pad + 17, '⚡', { fontFamily: 'monospace', fontSize: '7px', color: '#2ecc71' })
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    this.addBarTrack(pad + 14, pad + 17, BAR_W, 8);
    this.stBar = this.add.rectangle(pad + 14, pad + 17, BAR_W, 8, 0x1a8040)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    // Mana
    this.add.text(pad, pad + 29, '✦', { fontFamily: 'monospace', fontSize: '7px', color: '#3498db' })
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    this.addBarTrack(pad + 14, pad + 29, BAR_W, 8);
    this.mpBar = this.add.rectangle(pad + 14, pad + 29, BAR_W, 8, 0x1a4090)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    // Level + XP
    this.levelText = this.add.text(pad, pad + 42, 'LVL 1', {
      fontFamily: 'monospace', fontSize: '6px', color: '#ffd166',
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.addBarTrack(pad + 30, pad + 44, BAR_W - 6, 5);
    this.xpBar = this.add.rectangle(pad + 30, pad + 44, 0, 5, 0xffd166)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    // ── Embers (top-right) ───────────────────────────────────────────────
    const ep = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD);
    ep.fillStyle(0x080508, 0.82);
    ep.fillRoundedRect(this.scale.width - 70, pad - 4, 64, 22, 4);
    ep.lineStyle(1.5, PALETTE.EMBER_DEEP, 0.7);
    ep.strokeRoundedRect(this.scale.width - 70, pad - 4, 64, 22, 4);

    this.emberGlow = this.add.image(this.scale.width - 60, pad + 7, 'icon_ember')
      .setScrollFactor(0).setDepth(DEPTH.HUD);

    this.emberText = this.add.text(this.scale.width - 46, pad + 1, '0', {
      fontFamily: 'monospace', fontSize: '9px', color: '#ffd166',
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    // Initial fill
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
    const BAR_W = 110;
    this.hpBar.setSize(Math.max(1, BAR_W * Math.max(0, s.hp / s.maxHp)), 10);
    this.stBar.setSize(Math.max(1, BAR_W * Math.max(0, s.stamina / s.maxStamina)), 8);
    this.mpBar.setSize(Math.max(1, BAR_W * Math.max(0, s.mana / s.maxMana)), 8);
    this.xpBar.setSize(Math.max(0, (BAR_W - 6) * (s.xp / (s.level * 100))), 5);
    this.levelText.setText(`LVL ${s.level}`);
    this.emberText.setText(String(s.embers));
  }

  update(_t: number, delta: number) {
    this.uiTime += delta / 1000;
    this.emberGlow.setAlpha(0.8 + pulse(this.uiTime, 1.5) * 0.2);
  }
}
