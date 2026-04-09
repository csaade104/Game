import Phaser from 'phaser';
import { TILE_HALF_W, TILE_HALF_H } from '../config';

export type EnemyType = 'grunt' | 'shade' | 'boss';
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

  // Boss charge state
  private chargeTimer = 4.0;
  private charging = false;
  private chargeTime = 0;

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
    } else if (type === 'shade') {
      this.hp = this.maxHp = 22;
      this.attack = 6;
      this.speed = 100;
      this.sightRange = 9;
      this.attackRange = 0.9;
      this.attackCooldown = 0.9;
      this.dropEmbers = Phaser.Math.Between(1, 3);
      this.dropXP = 12;
    } else {
      // boss — Void Wraith
      this.hp = this.maxHp = 200;
      this.attack = 20;
      this.speed = 38;
      this.sightRange = 12;
      this.attackRange = 2.0;
      this.attackCooldown = 1.8;
      this.dropEmbers = Phaser.Math.Between(22, 35);
      this.dropXP = 120;
    }

    this.createSprites(scene);
  }

  private createSprites(scene: Phaser.Scene) {
    const scale = this.type === 'grunt' ? 1.6 : this.type === 'boss' ? 2.2 : 1.5;
    this.sprite = scene.add.image(0, 0, `enemy_${this.type}`, 0).setScale(scale);

    const barW = this.type === 'boss' ? 36 : 20;
    const barColor = this.type === 'grunt' ? 0xc02020 : this.type === 'boss' ? 0x9010d0 : 0x8020c0;
    this.hpBarBg = scene.add.rectangle(0, 0, barW, this.type === 'boss' ? 5 : 3, 0x1a0808).setOrigin(0.5, 1);
    this.hpBarFg = scene.add.rectangle(0, 0, barW, this.type === 'boss' ? 5 : 3, barColor).setOrigin(0, 1);
  }

  /** Called by DungeonScene each frame. Returns desired movement for collision handling. */
  updateAI(delta: number, playerX: number, playerY: number): EnemyAIResult {
    const result: EnemyAIResult = { desiredDX: 0, desiredDY: 0, playerHit: false, damage: 0 };
    if (!this.alive) return result;

    const dt = delta / 1000;
    const dist = Math.hypot(playerX - this.worldX, playerY - this.worldY);
    const baseSpeed = this.speed / Math.max(TILE_HALF_W, TILE_HALF_H);

    // Timers
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.stateTimer > 0) this.stateTimer -= dt;

    switch (this.state) {
      case 'idle':
        if (dist < this.sightRange) {
          this.state = 'chase';
        }
        break;

      case 'chase': {
        if (dist > this.sightRange * 1.6) {
          this.state = 'idle';
          break;
        }
        if (dist < this.attackRange && this.attackTimer <= 0) {
          this.state = 'attack';
          this.stateTimer = this.type === 'boss' ? 0.55 : 0.38;
          this.charging = false;
          break;
        }

        // Boss charge mechanic
        if (this.type === 'boss') {
          this.chargeTimer -= dt;
          if (this.chargeTimer <= 0 && !this.charging) {
            this.charging = true;
            this.chargeTime = 0.65;
            this.chargeTimer = 4.5 + Math.random() * 2;
          }
          if (this.charging) {
            this.chargeTime -= dt;
            if (this.chargeTime <= 0) {
              this.charging = false;
            } else {
              // Rush at triple speed — override normal movement below
              const chargeSpeed = (this.speed * 3.2) / Math.max(TILE_HALF_W, TILE_HALF_H);
              const angle = Math.atan2(playerY - this.worldY, playerX - this.worldX);
              result.desiredDX = Math.cos(angle) * chargeSpeed * dt;
              result.desiredDY = Math.sin(angle) * chargeSpeed * dt;
              // Boss flashes purple-white during charge
              this.sprite.setTint(0xd060ff);
              break;
            }
          }
          this.sprite.clearTint();
        }

        // Normal move toward player
        const angle = Math.atan2(playerY - this.worldY, playerX - this.worldX);
        result.desiredDX = Math.cos(angle) * baseSpeed * dt;
        result.desiredDY = Math.sin(angle) * baseSpeed * dt;

        // Walk animation
        this.walkTimer += dt;
        const animSpeed = this.type === 'boss' ? 0.28 : 0.22;
        if (this.walkTimer > animSpeed) {
          this.walkTimer = 0;
          this.sprite.setFrame(this.sprite.frame.name === '0' ? 1 : 0);
        }
        break;
      }

      case 'attack':
        if (this.stateTimer <= 0) {
          this.state = 'chase';
          this.attackTimer = this.attackCooldown;
          const reach = this.type === 'boss' ? 0.8 : 0.4;
          if (dist < this.attackRange + reach) {
            result.playerHit = true;
            result.damage = this.attack + Phaser.Math.Between(-3, 4);
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
    const yOffset = this.type === 'boss' ? -20 : -14;
    const barOffset = this.type === 'boss' ? -40 : -28;
    const barW = this.type === 'boss' ? 36 : 20;

    this.sprite.setPosition(sx, sy + yOffset);
    this.sprite.setDepth(depth + 30);

    const hpRatio = this.hp / this.maxHp;
    this.hpBarBg.setPosition(sx, sy + barOffset);
    this.hpBarFg.setPosition(sx - barW / 2, sy + barOffset);
    this.hpBarFg.setSize(Math.max(1, barW * hpRatio), this.type === 'boss' ? 5 : 3);
    this.hpBarBg.setDepth(depth + 31);
    this.hpBarFg.setDepth(depth + 32);
    const showBar = this.hp < this.maxHp;
    this.hpBarBg.setVisible(showBar);
    this.hpBarFg.setVisible(showBar);
  }

  takeDamage(amount: number) {
    if (!this.alive || this.state === 'dead') return;
    this.hp = Math.max(0, this.hp - amount);

    if (!this.charging) {
      this.sprite.setTint(0xff3030);
      this.scene.time.delayedCall(120, () => {
        if (this.sprite.active) this.sprite.clearTint();
      });
    }

    if (this.hp <= 0) {
      this.die();
    } else {
      this.state = 'hurt';
      this.hurtTimer = this.type === 'boss' ? 0.15 : 0.32; // boss recovers faster
    }
  }

  private die() {
    this.alive = false;
    this.state = 'dead';
    this.charging = false;
    this.sprite.clearTint();
    const duration = this.type === 'boss' ? 900 : 450;
    this.scene.tweens.add({
      targets: [this.sprite, this.hpBarBg, this.hpBarFg],
      alpha: 0, y: this.sprite.y - (this.type === 'boss' ? 20 : 8), duration,
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
