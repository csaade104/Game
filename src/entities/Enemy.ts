import Phaser from 'phaser';
import { TILE_HALF_W, TILE_HALF_H } from '../config';

export type EnemyType = 'grunt' | 'shade';
export type EnemyState = 'idle' | 'chase' | 'attack' | 'hurt' | 'dead';

export interface EnemyAIResult {
  desiredDX: number;
  desiredDY: number;
  playerHit: boolean;
  damage: number;
}

export class Enemy {
  scene: Phaser.Scene;
  worldX: number;
  worldY: number;
  readonly type: EnemyType;

  hp: number;
  maxHp: number;
  readonly attack: number;
  readonly speed: number;
  readonly sightRange: number;
  readonly attackRange: number;
  readonly attackCooldown: number;
  readonly dropEmbers: number;
  readonly dropXP: number;

  state: EnemyState = 'idle';
  alive = true;

  // Sprites (public so DungeonScene can sync positions)
  sprite!: Phaser.GameObjects.Image;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFg!: Phaser.GameObjects.Rectangle;

  // Timers
  private stateTimer = 0;
  private attackTimer = 0;
  private hurtTimer = 0;
  private walkTimer = 0;
  private deathTimer = 0;

  constructor(scene: Phaser.Scene, worldX: number, worldY: number, type: EnemyType) {
    this.scene = scene;
    this.worldX = worldX;
    this.worldY = worldY;
    this.type = type;

    if (type === 'grunt') {
      this.hp = this.maxHp = 45;
      this.attack = 10;
      this.speed = 52;
      this.sightRange = 7;
      this.attackRange = 1.3;
      this.attackCooldown = 1.4;
      this.dropEmbers = Phaser.Math.Between(2, 5);
      this.dropXP = 20;
    } else {
      this.hp = this.maxHp = 22;
      this.attack = 6;
      this.speed = 100;
      this.sightRange = 9;
      this.attackRange = 0.9;
      this.attackCooldown = 0.9;
      this.dropEmbers = Phaser.Math.Between(1, 3);
      this.dropXP = 12;
    }

    this.createSprites(scene);
  }

  private createSprites(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, `enemy_${this.type}`, 0)
      .setScale(this.type === 'grunt' ? 1.6 : 1.5);

    this.hpBarBg = scene.add.rectangle(0, 0, 20, 3, 0x1a0808).setOrigin(0.5, 1);
    this.hpBarFg = scene.add.rectangle(0, 0, 20, 3, this.type === 'grunt' ? 0xc02020 : 0x8020c0)
      .setOrigin(0, 1);
  }

  /** Called by DungeonScene each frame. Returns desired movement for collision handling. */
  updateAI(delta: number, playerX: number, playerY: number): EnemyAIResult {
    const result: EnemyAIResult = { desiredDX: 0, desiredDY: 0, playerHit: false, damage: 0 };
    if (!this.alive) return result;

    const dt = delta / 1000;
    const dist = Math.hypot(playerX - this.worldX, playerY - this.worldY);
    const speed = this.speed / Math.max(TILE_HALF_W, TILE_HALF_H);

    // Timers
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.stateTimer > 0) this.stateTimer -= dt;

    switch (this.state) {
      case 'idle':
        // Slow idle bob — handled by sprites
        if (dist < this.sightRange) {
          this.state = 'chase';
        }
        break;

      case 'chase':
        if (dist > this.sightRange * 1.6) {
          this.state = 'idle';
          break;
        }
        if (dist < this.attackRange && this.attackTimer <= 0) {
          this.state = 'attack';
          this.stateTimer = 0.38;
        } else {
          // Move toward player
          const angle = Math.atan2(playerY - this.worldY, playerX - this.worldX);
          result.desiredDX = Math.cos(angle) * speed * dt;
          result.desiredDY = Math.sin(angle) * speed * dt;
        }
        // Walk animation
        this.walkTimer += dt;
        if (this.walkTimer > 0.22) {
          this.walkTimer = 0;
          this.sprite.setFrame(this.sprite.frame.name === '0' ? 1 : 0);
        }
        break;

      case 'attack':
        if (this.stateTimer <= 0) {
          this.state = 'chase';
          this.attackTimer = this.attackCooldown;
          if (dist < this.attackRange + 0.4) {
            result.playerHit = true;
            result.damage = this.attack + Phaser.Math.Between(-2, 2);
          }
        }
        break;

      case 'hurt':
        if (this.hurtTimer <= 0) {
          this.state = dist < this.sightRange ? 'chase' : 'idle';
        }
        break;
    }

    return result;
  }

  /** Called by DungeonScene after collision-checked movement. Update visual position. */
  syncToScreen(sx: number, sy: number, depth: number) {
    this.sprite.setPosition(sx, sy - 14);
    this.sprite.setDepth(depth + 30);

    const hpRatio = this.hp / this.maxHp;
    this.hpBarBg.setPosition(sx, sy - 28);
    this.hpBarFg.setPosition(sx - 10, sy - 28);
    this.hpBarFg.setSize(Math.max(1, 20 * hpRatio), 3);
    this.hpBarBg.setDepth(depth + 31);
    this.hpBarFg.setDepth(depth + 32);
    // Hide HP bar when full
    const showBar = this.hp < this.maxHp;
    this.hpBarBg.setVisible(showBar);
    this.hpBarFg.setVisible(showBar);
  }

  takeDamage(amount: number) {
    if (!this.alive || this.state === 'dead') return;
    this.hp = Math.max(0, this.hp - amount);

    // Hit flash
    this.sprite.setTint(0xff3030);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });

    if (this.hp <= 0) {
      this.die();
    } else {
      this.state = 'hurt';
      this.hurtTimer = 0.32;
    }
  }

  private die() {
    this.alive = false;
    this.state = 'dead';
    this.scene.tweens.add({
      targets: [this.sprite, this.hpBarBg, this.hpBarFg],
      alpha: 0, y: this.sprite.y - 8, duration: 450,
      onComplete: () => {
        if (this.sprite.active) this.sprite.destroy();
        if (this.hpBarBg.active) this.hpBarBg.destroy();
        if (this.hpBarFg.active) this.hpBarFg.destroy();
      },
    });
  }

  destroy() {
    if (this.sprite.active) this.sprite.destroy();
    if (this.hpBarBg.active) this.hpBarBg.destroy();
    if (this.hpBarFg.active) this.hpBarFg.destroy();
  }
}
