import Phaser from 'phaser';
import { GAME_W, GAME_H, DEPTH } from '../config';
import { PALETTE } from '../utils/ColorPalette';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { InputManager } from '../systems/InputManager';
import { Player } from '../entities/Player';
import { pulse } from '../utils/Easing';

interface Stats {
  hp: number; maxHp: number;
  stamina: number; maxStamina: number;
  mana: number; maxMana: number;
  level: number; xp: number;
  embers: number;
}

export class UIScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private joystick!: VirtualJoystick;

  // HUD elements
  private hpBar!: Phaser.GameObjects.Image;
  private hpBg!: Phaser.GameObjects.Image;
  private staminaBar!: Phaser.GameObjects.Image;
  private staminaBg!: Phaser.GameObjects.Image;
  private manaBar!: Phaser.GameObjects.Image;
  private manaBg!: Phaser.GameObjects.Image;
  private xpBar!: Phaser.GameObjects.Graphics;
  private xpBg!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private emberText!: Phaser.GameObjects.Text;
  private emberIcon!: Phaser.GameObjects.Image;

  // Corner overlay
  private hudPanel!: Phaser.GameObjects.Graphics;

  private uiTime = 0;
  private lastStats: Stats | null = null;

  constructor() { super({ key: 'UIScene', active: false }); }

  create() {
    // Input (shares keyboard with HubScene)
    this.inputManager = new InputManager(this);
    this.joystick = new VirtualJoystick(this, this.inputManager);

    this.buildHUD();

    // Listen for stat updates from HubScene
    const hub = this.scene.get('HubScene');
    if (hub) {
      hub.events.on('update-stats', (stats: Stats) => {
        this.lastStats = stats;
        this.updateBars(stats);
      });
    }

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private buildHUD() {
    const pad = 8;

    // ── Left panel (HP / Stamina / Mana) ─────────────────────────────────
    this.hudPanel = this.add.graphics();
    this.hudPanel.fillStyle(0x0a0608, 0.7);
    this.hudPanel.fillRect(pad - 2, pad - 2, 116, 50);
    this.hudPanel.lineStyle(1, PALETTE.EMBER_DEEP, 0.5);
    this.hudPanel.strokeRect(pad - 2, pad - 2, 116, 50);
    this.hudPanel.setScrollFactor(0).setDepth(DEPTH.HUD);

    const BAR_W = 100;

    // HP label + bar
    this.add.text(pad, pad, 'HP', {
      fontFamily: 'monospace', fontSize: '5px', color: '#c0392b',
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.hpBg = this.add.image(pad + 14, pad + 1, 'bar_bg')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD)
      .setDisplaySize(BAR_W, 8);
    this.hpBar = this.add.image(pad + 14, pad + 1, 'bar_hp')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1)
      .setDisplaySize(BAR_W, 8);

    // Stamina
    this.add.text(pad, pad + 12, 'ST', {
      fontFamily: 'monospace', fontSize: '5px', color: '#27ae60',
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.staminaBg = this.add.image(pad + 14, pad + 13, 'bar_bg')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD)
      .setDisplaySize(BAR_W, 6);
    this.staminaBar = this.add.image(pad + 14, pad + 13, 'bar_stamina')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1)
      .setDisplaySize(BAR_W, 6);

    // Mana
    this.add.text(pad, pad + 22, 'MP', {
      fontFamily: 'monospace', fontSize: '5px', color: '#2980b9',
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.manaBg = this.add.image(pad + 14, pad + 23, 'bar_bg')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD)
      .setDisplaySize(BAR_W, 6);
    this.manaBar = this.add.image(pad + 14, pad + 23, 'bar_mana')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1)
      .setDisplaySize(BAR_W, 6);

    // Level badge
    this.levelText = this.add.text(pad + 2, pad + 34, 'LVL 1', {
      fontFamily: 'monospace', fontSize: '6px', color: '#ffd166',
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    // XP bar
    this.xpBg = this.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    this.xpBg.fillStyle(0x1a1010, 1);
    this.xpBg.fillRect(pad + 38, pad + 36, 70, 4);

    this.xpBar = this.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    // ── Embers (top-right corner) ─────────────────────────────────────────
    const ePanel = this.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    ePanel.fillStyle(0x0a0608, 0.7);
    ePanel.fillRect(GAME_W - 60, pad - 2, 54, 16);
    ePanel.lineStyle(1, PALETTE.EMBER_DEEP, 0.5);
    ePanel.strokeRect(GAME_W - 60, pad - 2, 54, 16);

    this.emberIcon = this.add.image(GAME_W - 54, pad + 5, 'icon_ember')
      .setScrollFactor(0).setDepth(DEPTH.HUD);

    this.emberText = this.add.text(GAME_W - 44, pad, '0', {
      fontFamily: 'monospace', fontSize: '7px', color: '#ffd166',
    }).setScrollFactor(0).setDepth(DEPTH.HUD);

    // ── Controls hint (bottom, disappears after 5s) ────────────────────────
    const hint = this.add.text(GAME_W / 2, GAME_H - 8, 'WASD / Arrow Keys to move  •  E to interact', {
      fontFamily: 'monospace', fontSize: '5px', color: '#4a3a2a',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.tweens.add({
      targets: hint,
      alpha: 0,
      duration: 1000,
      delay: 5000,
    });

    // Initial bar render
    this.updateBars({
      hp: 100, maxHp: 100,
      stamina: 80, maxStamina: 80,
      mana: 60, maxMana: 60,
      level: 1, xp: 0,
      embers: 0,
    });
  }

  private updateBars(stats: Stats) {
    const BAR_W = 100;
    const pad = 8;

    // HP
    const hpPct = Math.max(0, stats.hp / stats.maxHp);
    this.hpBar.setDisplaySize(Math.max(1, BAR_W * hpPct), 8);

    // Stamina
    const stPct = Math.max(0, stats.stamina / stats.maxStamina);
    this.staminaBar.setDisplaySize(Math.max(1, BAR_W * stPct), 6);

    // Mana
    const mpPct = Math.max(0, stats.mana / stats.maxMana);
    this.manaBar.setDisplaySize(Math.max(1, BAR_W * mpPct), 6);

    // Level
    this.levelText.setText(`LVL ${stats.level}`);

    // XP
    const xpPct = stats.xp / (stats.level * 100);
    this.xpBar.clear();
    this.xpBar.fillStyle(0xffd166, 1);
    this.xpBar.fillRect(pad + 38, pad + 36, 70 * xpPct, 4);

    // Embers
    this.emberText.setText(String(stats.embers));
  }

  update(_time: number, delta: number) {
    this.uiTime += delta / 1000;

    // Pulse ember icon
    this.emberIcon.setAlpha(0.7 + pulse(this.uiTime, 1.2) * 0.3);
  }
}
