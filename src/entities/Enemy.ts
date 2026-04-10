import Phaser from 'phaser';
import { TILE_HALF_W, TILE_HALF_H } from '../config';

export type EnemyType = 'grunt' | 'shade' | 'boss' | 'archer' | 'spearman';
export type EnemyState = 'idle' | 'chase' | 'attack' | 'hurt' | 'dead';

export interface EnemyAIResult {
  desiredDX: number;
  desiredDY: number;
  playerHit: boolean;
  damage: number;
  rangedAttack: boolean; // archer fires arrow — DungeonScene spawns VFX
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

  sprite!: Phaser.GameObjects.Image;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFg!: Phaser.GameObjects.Rectangle;

  private stateTimer = 0;
  private attackTimer = 0;
  private hurtTimer = 0;
  private walkTimer = 0;

  // Boss charge state
  private chargeTimer = 4.0;
  private charging = false;
  private chargeTime = 0;

  // Frame to show during attack (procedural enemies have '2', Minifolks reuse '1')
  private readonly attackFrame: string;

  // Spearman charge
  private spearChargeTimer = 3.0;
  private spearCharging = false;
  private spearChargeTime = 0;

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
      this.attackFrame = '2';
    } else if (type === 'shade') {
      this.hp = this.maxHp = 22;
      this.attack = 6;
      this.speed = 100;
      this.sightRange = 9;
      this.attackRange = 0.9;
      this.attackCooldown = 0.9;
      this.dropEmbers = Phaser.Math.Between(1, 3);
      this.dropXP = 12;
      this.attackFrame = '2';
    } else if (type === 'boss') {
      this.hp = this.maxHp = 200;
      this.attack = 20;
      this.speed = 38;
      this.sightRange = 12;
      this.attackRange = 2.0;
      this.attackCooldown = 1.8;
      this.dropEmbers = Phaser.Math.Between(22, 35);
      this.dropXP = 120;
      this.attackFrame = '2';
    } else if (type === 'archer') {
      // Ranged: stays at optimal distance, fires arrows
      this.hp = this.maxHp = 24;
      this.attack = 15;
      this.speed = 65;
      this.sightRange = 10;
      this.attackRange = 7.0;
      this.attackCooldown = 2.4;
      this.dropEmbers = Phaser.Math.Between(3, 7);
      this.dropXP = 22;
      this.attackFrame = '1'; // Minifolks — reuse walk frame for attack
    } else {
      // spearman: fast rusher with burst charge
      this.hp = this.maxHp = 38;
      this.attack = 20;
      this.speed = 108;
      this.sightRange = 8;
      this.attackRange = 1.5;
      this.attackCooldown = 1.6;
      this.dropEmbers = Phaser.Math.Between(4, 8);
      this.dropXP = 26;
      this.attackFrame = '1';
    }

    this.createSprites(scene);
  }

  private createSprites(scene: Phaser.Scene) {
    const scaleMap: Record<EnemyType, number> = {
      grunt: 1.6, shade: 1.5, boss: 2.2, archer: 1.2, spearman: 1.3,
    };
    const colorMap: Record<EnemyType, number> = {
      grunt: 0xc02020, shade: 0x8020c0, boss: 0x9010d0,
      archer: 0x20a060, spearman: 0xd08020,
    };
    this.sprite = scene.add.image(0, 0, `enemy_${this.type}`, '0')
      .setScale(scaleMap[this.type]);

    const barW = this.type === 'boss' ? 36 : 22;
    const barH = this.type === 'boss' ? 5 : 3;
    this.hpBarBg = scene.add.rectangle(0, 0, barW, barH, 0x1a0808).setOrigin(0.5, 1);
    this.hpBarFg = scene.add.rectangle(0, 0, barW, barH, colorMap[this.type]).setOrigin(0, 1);
  }

  updateAI(delta: number, playerX: number, playerY: number): EnemyAIResult {
    const result: EnemyAIResult = {
      desiredDX: 0, desiredDY: 0, playerHit: false, damage: 0, rangedAttack: false,
    };
    if (!this.alive) return result;

    const dt = delta / 1000;
    const dist = Math.hypot(playerX - this.worldX, playerY - this.worldY);
    const baseSpeed = this.speed / Math.max(TILE_HALF_W, TILE_HALF_H);

    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.stateTimer > 0) this.stateTimer -= dt;

    switch (this.state) {
      case 'idle':
        if (dist < this.sightRange) {
          this.state = 'chase';
        } else if (this.sprite.frame.name !== '0') {
          this.sprite.setFrame('0');
        }
        break;

      case 'chase': {
        if (dist > this.sightRange * 1.6) {
          this.state = 'idle';
          break;
        }

        // ── Archer: keep optimal distance, shoot from range ──────────────
        if (this.type === 'archer') {
          const optDist = 4.5; // preferred engagement distance
          const minDist = 3.0; // back away if player gets this close

          if (dist < minDist) {
            // Strafe away
            const angle = Math.atan2(this.worldY - playerY, this.worldX - playerX);
            result.desiredDX = Math.cos(angle) * baseSpeed * 0.7 * dt;
            result.desiredDY = Math.sin(angle) * baseSpeed * 0.7 * dt;
          } else if (dist > optDist) {
            // Close in slowly
            const angle = Math.atan2(playerY - this.worldY, playerX - this.worldX);
            result.desiredDX = Math.cos(angle) * baseSpeed * 0.5 * dt;
            result.desiredDY = Math.sin(angle) * baseSpeed * 0.5 * dt;
          }
          // In optimal band: stand still

          // Fire when in range
          if (dist < this.attackRange && this.attackTimer <= 0) {
            this.state = 'attack';
            this.stateTimer = 0.55;
          }

          // Walk anim only when moving
          if (result.desiredDX !== 0 || result.desiredDY !== 0) {
            this.walkTimer += dt;
            if (this.walkTimer > 0.25) {
              this.walkTimer = 0;
              this.sprite.setFrame(this.sprite.frame.name === '0' ? '1' : '0');
            }
          }
          break;
        }

        // ── Spearman: fast rusher with sprint charge ──────────────────────
        if (this.type === 'spearman') {
          this.spearChargeTimer -= dt;
          if (this.spearChargeTimer <= 0 && !this.spearCharging) {
            this.spearCharging = true;
            this.spearChargeTime = 0.5;
            this.spearChargeTimer = 3.0 + Math.random();
          }
          if (this.spearCharging) {
            this.spearChargeTime -= dt;
            if (this.spearChargeTime <= 0) {
              this.spearCharging = false;
            } else {
              const chargeSpeed = (this.speed * 2.8) / Math.max(TILE_HALF_W, TILE_HALF_H);
              const angle = Math.atan2(playerY - this.worldY, playerX - this.worldX);
              result.desiredDX = Math.cos(angle) * chargeSpeed * dt;
              result.desiredDY = Math.sin(angle) * chargeSpeed * dt;
              this.sprite.setTint(0xffe060); // golden flash during charge
              // Walk anim fast during charge
              this.walkTimer += dt * 3;
              if (this.walkTimer > 0.1) {
                this.walkTimer = 0;
                this.sprite.setFrame(this.sprite.frame.name === '0' ? '1' : '0');
              }
              break;
            }
          }
          this.sprite.clearTint();
        }

        if (dist < this.attackRange && this.attackTimer <= 0) {
          this.state = 'attack';
          this.stateTimer = this.type === 'boss' ? 0.55 : 0.38;
          this.charging = false;
          break;
        }

        // ── Boss charge ───────────────────────────────────────────────────
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
              const chargeSpeed = (this.speed * 3.2) / Math.max(TILE_HALF_W, TILE_HALF_H);
              const angle = Math.atan2(playerY - this.worldY, playerX - this.worldX);
              result.desiredDX = Math.cos(angle) * chargeSpeed * dt;
              result.desiredDY = Math.sin(angle) * chargeSpeed * dt;
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

        this.walkTimer += dt;
        const animSpeed = this.type === 'boss' ? 0.28 : 0.22;
        if (this.walkTimer > animSpeed) {
          this.walkTimer = 0;
          this.sprite.setFrame(this.sprite.frame.name === '0' ? '1' : '0');
        }
        break;
      }

      case 'attack':
        this.sprite.setFrame(this.attackFrame);
        if (this.stateTimer <= 0) {
          this.sprite.setFrame('0');
          this.state = 'chase';
          this.attackTimer = this.attackCooldown;

          // Archer: ranged hit — signal DungeonScene to spawn arrow VFX
          if (this.type === 'archer') {
            result.rangedAttack = true;
            if (dist < this.attackRange) {
              result.playerHit = true;
              result.damage = this.attack + Phaser.Math.Between(-3, 4);
            }
          } else {
            const reach = this.type === 'boss' ? 0.8 : 0.4;
            if (dist < this.attackRange + reach) {
              result.playerHit = true;
              result.damage = this.attack + Phaser.Math.Between(-3, 4);
            }
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

  syncToScreen(sx: number, sy: number, depth: number) {
    const yOffset = this.type === 'boss' ? -20 : -14;
    const barOffset = this.type === 'boss' ? -40 : -28;
    const barW = this.type === 'boss' ? 36 : 22;

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

    if (!this.charging && !this.spearCharging) {
      this.sprite.setTint(0xff3030);
      this.scene.time.delayedCall(120, () => {
        if (this.sprite.active) this.sprite.clearTint();
      });
    }

    if (this.hp <= 0) {
      this.die();
    } else {
      this.state = 'hurt';
      this.hurtTimer = this.type === 'boss' ? 0.15 : 0.32;
    }
  }

  private die() {
    this.alive = false;
    this.state = 'dead';
    this.charging = false;
    this.spearCharging = false;
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
