import Phaser from 'phaser';
import { PLAYER_SPEED, TILE_HALF_W, TILE_HALF_H, DEPTH } from '../config';
import { worldToScreen, depthOf } from '../utils/IsoMath';
import { BASE_STATS } from '../config';

export type FacingDir = 'N' | 'S' | 'E' | 'W';

interface PlayerState {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  level: number;
  xp: number;
  embers: number;
}

export class Player extends Phaser.GameObjects.Container {
  // World position (tile units, continuous)
  worldX: number;
  worldY: number;

  // Stats
  playerStats: PlayerState;

  // Visuals
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private lightGlow: Phaser.GameObjects.Image;

  // Movement
  private velX = 0;
  private velY = 0;
  private facing: FacingDir = 'S';
  private walkFrame = 0;
  private walkTimer = 0;
  private isMoving = false;

  // Stamina regen
  private staminaRegen = 0;

  // Hub collision map reference
  private collisionMap: number[][] = [];
  private mapCols = 0;
  private mapRows = 0;

  constructor(scene: Phaser.Scene, worldX: number, worldY: number) {
    const screen = worldToScreen(worldX, worldY);
    super(scene, screen.x, screen.y);

    this.worldX = worldX;
    this.worldY = worldY;

    this.playerStats = { ...BASE_STATS };

    // Shadow (behind player)
    this.shadow = scene.add.image(0, 12, 'entity_shadow').setAlpha(0.5);
    this.add(this.shadow);

    // Lantern glow
    this.lightGlow = scene.add.image(0, 0, 'light_radial')
      .setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.2);
    this.add(this.lightGlow);

    // Player sprite
    this.sprite = scene.add.image(0, 0, 'player', 'idle_s');
    this.add(this.sprite);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scene.add.existing(this as any);
    this.setDepth(DEPTH.PLAYER);

    // Animations via frame keys (canvas texture)
    this.createAnimations(scene);
  }

  private createAnimations(scene: Phaser.Scene) {
    // We'll drive animations manually via frame swapping for the canvas texture
    // (Phaser anims work with atlas/spritesheet, our canvas texture uses named frames)
  }

  setCollisionMap(map: number[][], cols: number, rows: number) {
    this.collisionMap = map;
    this.mapCols = cols;
    this.mapRows = rows;
  }

  setVelocity(vx: number, vy: number) {
    this.velX = vx;
    this.velY = vy;
  }

  update(delta: number) {
    const dt = delta / 1000;

    // ── Movement ──────────────────────────────────────────────────────────
    const speed = PLAYER_SPEED / Math.max(TILE_HALF_W, TILE_HALF_H);
    const dx = this.velX * speed * dt;
    const dy = this.velY * speed * dt;

    this.isMoving = (dx !== 0 || dy !== 0);

    if (this.isMoving) {
      const newX = this.worldX + dx;
      const newY = this.worldY + dy;

      // Simple collision: check if destination tile is walkable
      const col = Math.floor(newX);
      const row = Math.floor(newY);
      const walkable = this.isTileWalkable(col, row);

      if (walkable) {
        this.worldX = newX;
        this.worldY = newY;
      } else {
        // Try sliding X only
        const colX = Math.floor(this.worldX + dx);
        const rowX = Math.floor(this.worldY);
        if (this.isTileWalkable(colX, rowX)) {
          this.worldX += dx;
        }
        // Try sliding Y only
        const colY = Math.floor(this.worldX);
        const rowY = Math.floor(this.worldY + dy);
        if (this.isTileWalkable(colY, rowY)) {
          this.worldY += dy;
        }
      }

      // Update facing direction
      if (Math.abs(this.velX) > Math.abs(this.velY)) {
        this.facing = this.velX > 0 ? 'E' : 'W';
      } else {
        this.facing = this.velY > 0 ? 'S' : 'N';
      }
    }

    // ── Update screen position ─────────────────────────────────────────────
    const screen = worldToScreen(this.worldX, this.worldY);
    this.x = screen.x;
    this.y = screen.y;
    this.setDepth(depthOf(this.worldX, this.worldY) + 50);

    // ── Walk animation ─────────────────────────────────────────────────────
    if (this.isMoving) {
      this.walkTimer += dt;
      if (this.walkTimer > 0.12) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame % 3) + 1;
      }
    } else {
      this.walkFrame = 0;
      this.walkTimer = 0;
    }

    const dir = this.facing.toLowerCase();
    const frameKey = this.walkFrame === 0
      ? `idle_${dir}`
      : `walk_${dir}_${this.walkFrame}`;
    this.sprite.setFrame(frameKey);

    // ── Lantern glow pulse ─────────────────────────────────────────────────
    const t = this.scene.time.now / 1000;
    this.lightGlow.setAlpha(0.15 + Math.sin(t * 1.8) * 0.04);

    // ── Stamina regen ──────────────────────────────────────────────────────
    if (!this.isMoving) {
      this.staminaRegen += dt;
      if (this.staminaRegen > 0.5) {
        this.staminaRegen = 0;
        this.playerStats.stamina = Math.min(this.playerStats.maxStamina, this.playerStats.stamina + 2);
      }
    }
  }

  private isTileWalkable(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.mapCols || row >= this.mapRows) return false;
    if (!this.collisionMap[row]) return false;
    const tile = this.collisionMap[row][col];
    // 4 = wall, 0 = void — not walkable
    return tile !== 4 && tile !== 0;
  }

  getWorldPos() {
    return { x: this.worldX, y: this.worldY };
  }

  getStats() {
    return this.playerStats;
  }

  gainXP(amount: number) {
    this.playerStats.xp += amount;
    const xpNeeded = this.playerStats.level * 100;
    if (this.playerStats.xp >= xpNeeded) {
      this.playerStats.xp -= xpNeeded;
      this.playerStats.level++;
      this.playerStats.maxHp += 10;
      this.playerStats.hp = this.playerStats.maxHp;
      this.playerStats.maxStamina += 5;
      this.playerStats.attack += 2;
      this.playerStats.defense += 1;
    }
  }

  addEmbers(amount: number) {
    this.playerStats.embers += amount;
  }
}
