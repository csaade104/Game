import Phaser from 'phaser';
import { screenInputToWorld } from '../utils/IsoMath';

export interface InputState {
  worldDX: number;   // isometric world X velocity (-1..1)
  worldDY: number;   // isometric world Y velocity (-1..1)
  attack: boolean;
  interact: boolean;
  inventory: boolean;
  map: boolean;
  pause: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    attack: Phaser.Input.Keyboard.Key;
    interact: Phaser.Input.Keyboard.Key;
    inventory: Phaser.Input.Keyboard.Key;
    mapKey: Phaser.Input.Keyboard.Key;
    pause: Phaser.Input.Keyboard.Key;
  };

  // Virtual joystick input (set externally by VirtualJoystick)
  joystickDX = 0;
  joystickDY = 0;
  joystickAttack = false;
  joystickInteract = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeys();
  }

  private setupKeys() {
    const kb = this.scene.input.keyboard!;
    this.keys = {
      up:        kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down:      kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left:      kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      w:         kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a:         kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s:         kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d:         kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      attack:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      interact:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      inventory: kb.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      mapKey:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      pause:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };
  }

  getState(): InputState {
    const k = this.keys;

    // Raw screen-space direction from keyboard
    let screenX = 0;
    let screenY = 0;

    if (k.left.isDown  || k.a.isDown) screenX -= 1;
    if (k.right.isDown || k.d.isDown) screenX += 1;
    if (k.up.isDown    || k.w.isDown) screenY -= 1;
    if (k.down.isDown  || k.s.isDown) screenY += 1;

    // Add joystick contribution
    screenX += this.joystickDX;
    screenY += this.joystickDY;

    // Clamp to unit
    const mag = Math.sqrt(screenX * screenX + screenY * screenY);
    if (mag > 1) {
      screenX /= mag;
      screenY /= mag;
    }

    // Map screen direction → isometric world direction
    const world = screenInputToWorld(screenX, screenY);

    return {
      worldDX:   world.x,
      worldDY:   world.y,
      attack:    Phaser.Input.Keyboard.JustDown(k.attack) || this.joystickAttack,
      interact:  Phaser.Input.Keyboard.JustDown(k.interact) || this.joystickInteract,
      inventory: Phaser.Input.Keyboard.JustDown(k.inventory),
      map:       Phaser.Input.Keyboard.JustDown(k.mapKey),
      pause:     Phaser.Input.Keyboard.JustDown(k.pause),
    };
  }

  destroy() {
    // Keys will be cleaned up with scene
  }
}
