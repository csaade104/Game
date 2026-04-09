import Phaser from 'phaser';
import { InputManager } from '../systems/InputManager';
import { GAME_W, GAME_H } from '../config';

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private input: InputManager;

  // Joystick
  private baseX: number;
  private baseY: number;
  private jBase!: Phaser.GameObjects.Image;
  private jThumb!: Phaser.GameObjects.Image;
  private jPointer: Phaser.Input.Pointer | null = null;
  private jPointerId = -1;
  private maxRadius = 30;

  // Buttons
  private attackBtn!: Phaser.GameObjects.Container;
  private interactBtn!: Phaser.GameObjects.Container;

  private visible = false;

  constructor(scene: Phaser.Scene, input: InputManager) {
    this.scene = scene;
    this.input = input;

    // Default position: lower-left
    this.baseX = 55;
    this.baseY = GAME_H - 55;

    this.createJoystick();
    this.createButtons();
    this.setupEvents();

    // Only show on touch devices
    this.setVisible(this.isTouchDevice());
  }

  private isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private createJoystick() {
    this.jBase = this.scene.add.image(this.baseX, this.baseY, 'joystick_base')
      .setScrollFactor(0)
      .setDepth(2000)
      .setAlpha(0.7);

    this.jThumb = this.scene.add.image(this.baseX, this.baseY, 'joystick_thumb')
      .setScrollFactor(0)
      .setDepth(2001)
      .setAlpha(0.9);
  }

  private createButtons() {
    const btnX = GAME_W - 30;
    const btnY = GAME_H - 50;

    // Attack button (circle A)
    this.attackBtn = this.createButton(btnX, btnY, '⚔', 0xff6b35, () => {
      this.input.joystickAttack = true;
      this.scene.time.delayedCall(100, () => { this.input.joystickAttack = false; });
    });

    // Interact button (circle B)
    this.interactBtn = this.createButton(btnX - 32, btnY - 18, 'E', 0x6a9fd8, () => {
      this.input.joystickInteract = true;
      this.scene.time.delayedCall(100, () => { this.input.joystickInteract = false; });
    });
  }

  private createButton(
    x: number, y: number,
    label: string,
    color: number,
    onTap: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(2000);

    // Background circle
    const bg = this.scene.add.graphics();
    bg.fillStyle(color, 0.5);
    bg.fillCircle(0, 0, 16);
    bg.lineStyle(1.5, color, 0.9);
    bg.strokeCircle(0, 0, 16);
    container.add(bg);

    // Label
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(text);

    // Touch event
    bg.setInteractive(
      new Phaser.Geom.Circle(0, 0, 16),
      Phaser.Geom.Circle.Contains
    );
    bg.on('pointerdown', () => {
      onTap();
      this.scene.tweens.add({
        targets: container,
        scaleX: 0.85, scaleY: 0.85,
        duration: 80, yoyo: true,
      });
    });

    return container;
  }

  private setupEvents() {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible) return;
      // Only claim if in left half of screen and no joystick pointer yet
      if (pointer.x < GAME_W * 0.5 && this.jPointerId === -1) {
        this.jPointer = pointer;
        this.jPointerId = pointer.id;
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible || pointer.id !== this.jPointerId) return;
      this.updateJoystick(pointer.x, pointer.y);
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.jPointerId) {
        this.jPointer = null;
        this.jPointerId = -1;
        this.resetJoystick();
      }
    });
  }

  private updateJoystick(px: number, py: number) {
    // Convert screen coords to scene coords (accounting for camera scale)
    const cam = this.scene.cameras.main;
    const sx = (px / cam.zoom);
    const sy = (py / cam.zoom);

    const dx = sx - this.baseX;
    const dy = sy - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);

    // Thumb position
    this.jThumb.x = this.baseX + Math.cos(angle) * clamped;
    this.jThumb.y = this.baseY + Math.sin(angle) * clamped;

    // Normalized input
    const norm = Math.min(dist / this.maxRadius, 1);
    this.input.joystickDX = Math.cos(angle) * norm;
    this.input.joystickDY = Math.sin(angle) * norm;
  }

  private resetJoystick() {
    this.jThumb.x = this.baseX;
    this.jThumb.y = this.baseY;
    this.input.joystickDX = 0;
    this.input.joystickDY = 0;
  }

  setVisible(v: boolean) {
    this.visible = v;
    this.jBase.setVisible(v);
    this.jThumb.setVisible(v);
    this.attackBtn.setVisible(v);
    this.interactBtn.setVisible(v);
  }

  // Always show on mobile regardless
  forceShow() { this.setVisible(true); }

  destroy() {
    this.jBase.destroy();
    this.jThumb.destroy();
    this.attackBtn.destroy();
    this.interactBtn.destroy();
  }
}
