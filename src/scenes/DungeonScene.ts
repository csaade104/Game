import Phaser from 'phaser';
import { TILE_W, TILE_H, TILE_HALF_W, TILE_HALF_H, HUB_COLS, DEPTH, CAM_LERP } from '../config';
import { gridToScreen, depthOf } from '../utils/IsoMath';
import { PALETTE } from '../utils/ColorPalette';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { InputManager } from '../systems/InputManager';

const DT = { VOID: 0, FLOOR: 1, WALL: 2, EMBER_FLOOR: 3, EXIT: 4 } as const;
const DCOLS = 32, DROWS = 32;

interface Rect { x: number; y: number; w: number; h: number; }

export class DungeonScene extends Phaser.Scene {
  private player!: Player;
  public inputMgr!: InputManager;
  private groundRT!: Phaser.GameObjects.RenderTexture;
  private enemies: Enemy[] = [];
  private emberPickups: Array<{ sprite: Phaser.GameObjects.Image; worldX: number; worldY: number }> = [];
  private chests: Array<{ sprite: Phaser.GameObjects.Image; worldX: number; worldY: number; opened: boolean }> = [];
  private playerLightSprite!: Phaser.GameObjects.Image;
  private exitGlow!: Phaser.GameObjects.Image;

  private dungeonMap: number[][] = [];
  private rooms: Rect[] = [];
  private startRoom!: Rect;
  private exitRoom!: Rect;
  private exitWorldX = 0; private exitWorldY = 0;

  private mapW = 0; private mapH = 0;
  private mapOX = 0; private mapOY = 0;
  public camZoom = 0.7;

  private exiting = false;
  private nearExit = false;
  private depth = 1;

  constructor() { super('DungeonScene'); }

  create() {
    const savedDepth = this.game.registry.get('dungeonDepth') ?? 1;
    this.depth = Number(savedDepth);

    this.mapW = (DCOLS + DROWS) * TILE_HALF_W;
    this.mapH = (DCOLS + DROWS) * TILE_HALF_H;
    this.mapOX = -(this.mapW / 2) + TILE_HALF_W;
    this.mapOY = -(this.mapH / 4);

    this.camZoom = 0.7;
    this.cameras.main.setBackgroundColor('#050308');
    this.cameras.main.setBounds(
      this.mapOX - this.scale.width / 2, this.mapOY - this.scale.height / 2,
      this.mapW + this.scale.width, this.mapH + this.scale.height
    );
    this.cameras.main.setZoom(this.camZoom);

    // Generate dungeon
    this.generateDungeon();
    this.buildGround();
    this.buildDecor();
    this.buildExit();
    this.spawnPlayer();
    this.spawnEnemies();
    this.spawnEmbers();
    this.spawnChests();
    this.buildAtmosphere();

    this.cameras.main.startFollow(this.player, true, CAM_LERP, CAM_LERP);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.inputMgr = new InputManager(this);

    // Bind UIScene
    const ui = this.scene.get('UIScene') as any;
    if (ui?.bindToScene) ui.bindToScene(this);

    this.cameras.main.fadeIn(700, 0, 0, 0);
    this.events.emit('update-stats', this.player.playerStats);
  }

  // ── Coordinate helper ──────────────────────────────────────────────────────
  private isoToScene(col: number, row: number) {
    const s = gridToScreen(col, row);
    return { x: s.x + this.mapOX, y: s.y + this.mapOY };
  }

  private isTileWalkable(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= DCOLS || row >= DROWS) return false;
    const t = this.dungeonMap[row]?.[col] ?? DT.VOID;
    return t === DT.FLOOR || t === DT.EMBER_FLOOR || t === DT.EXIT;
  }

  // ── Dungeon generation ─────────────────────────────────────────────────────
  private generateDungeon() {
    this.dungeonMap = Array.from({ length: DROWS }, () => new Array(DCOLS).fill(DT.WALL));

    const rooms: Rect[] = [];
    const target = 7 + Math.floor(this.depth * 0.5);
    const maxRooms = Math.min(target, 10);

    for (let attempt = 0; attempt < 120 && rooms.length < maxRooms; attempt++) {
      const w = Phaser.Math.Between(6, 11);
      const h = Phaser.Math.Between(5, 9);
      const x = Phaser.Math.Between(2, DCOLS - w - 3);
      const y = Phaser.Math.Between(2, DROWS - h - 3);

      const margin = 2;
      if (rooms.some(r =>
        x < r.x + r.w + margin && x + w + margin > r.x &&
        y < r.y + r.h + margin && y + h + margin > r.y
      )) continue;

      for (let ry = y; ry < y + h; ry++)
        for (let rx = x; rx < x + w; rx++)
          this.dungeonMap[ry][rx] = DT.FLOOR;

      // Scatter a few ember floor tiles for atmosphere
      for (let e = 0; e < 2; e++) {
        const ex = x + Phaser.Math.Between(1, w - 2);
        const ey = y + Phaser.Math.Between(1, h - 2);
        this.dungeonMap[ey][ex] = DT.EMBER_FLOOR;
      }

      rooms.push({ x, y, w, h });
    }

    // Connect rooms with corridors (chain, 2-wide)
    rooms.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const cHalf = 1;
    for (let i = 0; i < rooms.length - 1; i++) {
      const a = rooms[i], b = rooms[i + 1];
      const ax = Math.floor(a.x + a.w / 2);
      const ay = Math.floor(a.y + a.h / 2);
      const bx = Math.floor(b.x + b.w / 2);
      const by = Math.floor(b.y + b.h / 2);
      // Horizontal leg
      for (let cx = Math.min(ax, bx); cx <= Math.max(ax, bx); cx++)
        for (let dy = -cHalf; dy <= cHalf; dy++) {
          const ry = ay + dy;
          if (ry >= 1 && ry < DROWS - 1 && this.dungeonMap[ry][cx] === DT.WALL)
            this.dungeonMap[ry][cx] = DT.FLOOR;
        }
      // Vertical leg
      for (let cy = Math.min(ay, by); cy <= Math.max(ay, by); cy++)
        for (let dx = -cHalf; dx <= cHalf; dx++) {
          const rx = bx + dx;
          if (rx >= 1 && rx < DCOLS - 1 && this.dungeonMap[cy][rx] === DT.WALL)
            this.dungeonMap[cy][rx] = DT.FLOOR;
        }
    }

    // Safety: guarantee at least one room so the rest of generation never crashes
    if (rooms.length === 0) {
      const fallback: Rect = { x: 6, y: 6, w: 8, h: 7 };
      for (let ry = fallback.y; ry < fallback.y + fallback.h; ry++)
        for (let rx = fallback.x; rx < fallback.x + fallback.w; rx++)
          this.dungeonMap[ry][rx] = DT.FLOOR;
      rooms.push(fallback);
    }

    this.rooms = rooms;
    this.startRoom = rooms[0];
    this.exitRoom = rooms[rooms.length - 1];

    // Place exit in center of exit room
    this.exitWorldX = Math.floor(this.exitRoom.x + this.exitRoom.w / 2);
    this.exitWorldY = Math.floor(this.exitRoom.y + this.exitRoom.h / 2);
    this.dungeonMap[this.exitWorldY][this.exitWorldX] = DT.EXIT;
  }

  // ── Ground render texture ──────────────────────────────────────────────────
  private buildGround() {
    const rtW = this.mapW + TILE_W * 2;
    const rtH = this.mapH + TILE_H * 4;
    this.groundRT = this.add.renderTexture(this.mapOX - TILE_W, this.mapOY, rtW, rtH)
      .setOrigin(0, 0).setDepth(DEPTH.GROUND);

    for (let row = 0; row < DROWS; row++) {
      for (let col = 0; col < DCOLS; col++) {
        const t = this.dungeonMap[row]?.[col] ?? DT.VOID;
        if (t === DT.VOID || t === DT.WALL) continue;
        const s = gridToScreen(col, row);
        const tx = s.x + TILE_W, ty = s.y;
        let key = 'tile_dungeon_floor';
        if (t === DT.EMBER_FLOOR) key = 'tile_dungeon_ember';
        else if (t === DT.EXIT) key = 'tile_dungeon_exit';
        this.groundRT.draw(key, tx, ty);
      }
    }
  }

  // ── Decorative torches along walls ─────────────────────────────────────────
  private buildDecor() {
    // Place torches at room corners
    for (const room of this.rooms) {
      const corners = [
        [room.x + 1, room.y + 1],
        [room.x + room.w - 2, room.y + 1],
        [room.x + 1, room.y + room.h - 2],
        [room.x + room.w - 2, room.y + room.h - 2],
      ];
      for (const [col, row] of corners) {
        if (!this.isTileWalkable(col, row)) continue;
        const s = this.isoToScene(col, row);
        const torch = this.add.image(s.x + 6, s.y - 22, 'prop_dungeon_torch')
          .setDepth(depthOf(col, row) + 5).setScale(1.2);
        // Warm glow
        const glow = this.add.image(s.x + 6, s.y - 28, 'light_radial')
          .setScale(1.2).setTint(0xffa040).setAlpha(0.3)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(depthOf(col, row) + 4);
        this.tweens.add({
          targets: glow, alpha: 0.15, scaleX: 1.0, scaleY: 1.0,
          duration: 300 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.InOut',
        });
        // Ember particles from torch
        this.add.particles(s.x + 6, s.y - 36, 'particle_ember', {
          speed: { min: 4, max: 10 }, angle: { min: 255, max: 285 },
          lifespan: { min: 500, max: 1000 }, scale: { start: 0.8, end: 0 },
          alpha: { start: 0.8, end: 0 }, frequency: 500, quantity: 1,
          tint: [0xffa040, 0xff6020], blendMode: Phaser.BlendModes.ADD,
        }).setDepth(depthOf(col, row) + 6);
        void torch;
      }
    }
  }

  // ── Exit portal ────────────────────────────────────────────────────────────
  private buildExit() {
    const s = this.isoToScene(this.exitWorldX, this.exitWorldY);

    // Central light column
    this.exitGlow = this.add.image(s.x, s.y - 16, 'light_radial')
      .setScale(1.8).setTint(0xff2010).setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depthOf(this.exitWorldX, this.exitWorldY) + 10);

    // Pulsing particles
    this.add.particles(s.x, s.y - 8, 'particle_ember', {
      speed: { min: 6, max: 16 }, angle: { min: 250, max: 290 },
      lifespan: { min: 800, max: 2000 }, scale: { start: 1.2, end: 0 },
      alpha: { start: 0.9, end: 0 }, frequency: 200, quantity: 1,
      tint: [0xff2010, 0xff6020, 0xffa040], blendMode: Phaser.BlendModes.ADD,
    }).setDepth(depthOf(this.exitWorldX, this.exitWorldY) + 11);
  }

  // ── Player ─────────────────────────────────────────────────────────────────
  private spawnPlayer() {
    const startCol = Math.floor(this.startRoom.x + this.startRoom.w / 2);
    const startRow = Math.floor(this.startRoom.y + this.startRoom.h / 2);
    this.player = new Player(this, startCol, startRow);
    this.player.setCollisionMap(this.dungeonMap, DCOLS, DROWS);

    // Restore stats from registry if returning from dungeon
    const saved = this.game.registry.get('playerStats');
    if (saved) Object.assign(this.player.playerStats, saved);

    this.syncPlayerPos();
  }

  private syncPlayerPos() {
    const s = this.isoToScene(this.player.worldX, this.player.worldY);
    this.player.x = s.x;
    this.player.y = s.y - 14;
    this.player.setDepth(depthOf(this.player.worldX, this.player.worldY) + 50);
  }

  // ── Enemies ────────────────────────────────────────────────────────────────
  private spawnEnemies() {
    const lastRoomIdx = this.rooms.length - 1;

    // Spawn boss in exit room at depth >= 2
    if (this.depth >= 2 && this.rooms.length > 1) {
      const bossCol = Math.floor(this.exitRoom.x + this.exitRoom.w / 2) - 1;
      const bossRow = Math.floor(this.exitRoom.y + this.exitRoom.h / 2) - 1;
      if (this.isTileWalkable(bossCol, bossRow)) {
        this.enemies.push(new Enemy(this, bossCol + 0.5, bossRow + 0.5, 'boss'));
      }
      // Boss name label
      const bs = this.isoToScene(bossCol + 0.5, bossRow + 0.5);
      const nameTag = this.add.text(bs.x, bs.y - 52, 'VOID WRAITH', {
        fontFamily: 'monospace', fontSize: '8px', color: '#c040ff',
        stroke: '#000000', strokeThickness: 2, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(9000).setAlpha(0);
      this.time.delayedCall(600, () => {
        this.tweens.add({ targets: nameTag, alpha: 1, duration: 400 });
        this.time.delayedCall(2500, () => this.tweens.add({ targets: nameTag, alpha: 0, duration: 600, onComplete: () => nameTag.destroy() }));
      });
    }

    const enemyCount = Math.min(4 + this.depth * 2, 18);
    // When a boss occupies the exit room, regular enemies pick from all other rooms
    const maxEnemyRoom = (this.depth >= 2 && this.rooms.length > 1)
      ? lastRoomIdx - 1
      : lastRoomIdx;

    for (let i = 0; i < enemyCount; i++) {
      const roomIdx = Phaser.Math.Between(1, Math.max(1, maxEnemyRoom));
      const room = this.rooms[roomIdx];
      const col = room.x + Phaser.Math.Between(1, room.w - 2);
      const row = room.y + Phaser.Math.Between(1, room.h - 2);
      if (!this.isTileWalkable(col, row)) continue;

      const type = Math.random() < 0.55 ? 'grunt' : 'shade';
      this.enemies.push(new Enemy(this, col + 0.5, row + 0.5, type));
    }
  }

  // ── Treasure chests ────────────────────────────────────────────────────────
  private spawnChests() {
    const count = Math.min(2 + Math.floor(this.depth * 0.5), 4);
    const lastRoomIdx = this.rooms.length - 1;
    for (let i = 0; i < count; i++) {
      // Avoid start and exit rooms for chests
      const roomIdx = Phaser.Math.Between(1, Math.max(1, lastRoomIdx - 1));
      const room = this.rooms[roomIdx];
      const col = Math.floor(room.x + room.w / 2);
      const row = Math.floor(room.y + room.h / 2);
      if (!this.isTileWalkable(col, row)) continue;
      const wx = col + 0.3, wy = row + 0.3;
      const s = this.isoToScene(wx, wy);
      const sprite = this.add.image(s.x, s.y - 8, 'prop_chest')
        .setDepth(depthOf(wx, wy) + 5).setScale(1.5);
      this.chests.push({ sprite, worldX: wx, worldY: wy, opened: false });
    }
  }

  // ── Ember pickups ──────────────────────────────────────────────────────────
  private spawnEmbers() {
    const count = 8 + this.depth * 2;
    for (let i = 0; i < count; i++) {
      const roomIdx = Phaser.Math.Between(0, this.rooms.length - 1);
      const room = this.rooms[roomIdx];
      const col = room.x + Phaser.Math.Between(1, room.w - 2);
      const row = room.y + Phaser.Math.Between(1, room.h - 2);
      if (!this.isTileWalkable(col, row)) continue;

      const wx = col + 0.4 + Math.random() * 0.2;
      const wy = row + 0.4 + Math.random() * 0.2;
      const s = this.isoToScene(wx, wy);
      const sprite = this.add.image(s.x, s.y - 6, 'pickup_ember_ground')
        .setDepth(depthOf(wx, wy) + 5).setScale(1.3);

      this.tweens.add({ targets: sprite, y: s.y - 10, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.add.image(s.x, s.y - 4, 'light_radial')
        .setScale(0.4).setTint(0xff6020).setAlpha(0.22)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(depthOf(wx, wy) + 4);

      this.emberPickups.push({ sprite, worldX: wx, worldY: wy });
    }
  }

  // ── Atmosphere ─────────────────────────────────────────────────────────────
  private buildAtmosphere() {
    // Deep darkness covering the whole map — punched out by player light (ADD blend)
    const fog = this.add.graphics().setDepth(DEPTH.OVERLAY - 3);
    fog.fillStyle(0x000000, 0.80);
    fog.fillRect(this.mapOX - 80, this.mapOY - 80, this.mapW + 160, this.mapH + 160);

    // Player torch glow (moves with player each frame)
    this.playerLightSprite = this.add.image(0, 0, 'light_radial')
      .setScale(5.5).setTint(0xffa060).setAlpha(0.44)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.OVERLAY - 2);

    // Secondary soft ambient light around player
    this.add.image(0, 0, 'light_radial')
      .setScale(3.0).setTint(0x604020).setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.OVERLAY - 2)
      .setName('ambient_light');
  }

  // ── Damage number floater ──────────────────────────────────────────────────
  private showDamageNumber(worldX: number, worldY: number, dmg: number, color = '#ff6b35') {
    const s = this.isoToScene(worldX, worldY);
    const txt = this.add.text(s.x, s.y - 20, String(dmg), {
      fontFamily: 'monospace', fontSize: '9px', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(DEPTH.DIALOGUE).setScale(1.3);
    this.tweens.add({
      targets: txt, y: s.y - 42, alpha: 0, duration: 850,
      ease: 'Power1', onComplete: () => txt.destroy(),
    });
  }

  // ── Exit dungeon ────────────────────────────────────────────────────────────
  private exitDungeon() {
    if (this.exiting) return;
    this.exiting = true;
    this.nearExit = false;
    this.events.emit('exit-prompt', false);

    // Save stats + increment depth
    this.game.registry.set('playerStats', { ...this.player.playerStats });
    this.game.registry.set('dungeonDepth', this.depth + 1);

    this.cameras.main.flash(200, 255, 120, 60);
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const ui = this.scene.get('UIScene') as any;
      this.scene.start('HubScene');
      // Re-bind UIScene to HubScene after it starts
      this.time.delayedCall(100, () => {
        const hub = this.scene.get('HubScene');
        if (hub && ui?.bindToScene) ui.bindToScene(hub);
      });
    });
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    const dt = delta / 1000;

    // Exit glow pulse
    if (this.exitGlow?.active) {
      this.exitGlow.setAlpha(0.4 + Math.sin(_time * 0.003) * 0.15);
    }

    if (this.exiting) return;

    // Input
    const inp = this.inputMgr.getState();
    this.player.setVelocity(inp.worldDX, inp.worldDY);
    this.player.update(delta);
    this.syncPlayerPos();

    // Player torch follows player
    this.playerLightSprite.setPosition(this.player.x, this.player.y - 12);
    const ambLight = this.children.getByName('ambient_light') as Phaser.GameObjects.Image;
    if (ambLight) ambLight.setPosition(this.player.x, this.player.y - 8);

    // ── Attack ────────────────────────────────────────────────────────────
    if (inp.attack) {
      const hitbox = this.player.startAttack();
      if (hitbox) {
        let hitCount = 0;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const d = Math.hypot(e.worldX - hitbox.worldX, e.worldY - hitbox.worldY);
          if (d < hitbox.radius) {
            const dmg = this.player.playerStats.attack + Phaser.Math.Between(-2, 4);
            e.takeDamage(dmg);
            this.showDamageNumber(e.worldX, e.worldY - 0.5, dmg);
            if (!e.alive) {
              this.player.gainXP(e.dropXP);
              this.player.playerStats.embers += e.dropEmbers;
              // Drop ember particles at death location
              const ds = this.isoToScene(e.worldX, e.worldY);
              this.add.particles(ds.x, ds.y - 10, 'particle_ember', {
                speed: { min: 20, max: 60 }, angle: { min: 0, max: 360 },
                lifespan: { min: 600, max: 1200 }, scale: { start: 1.2, end: 0 },
                quantity: 8, duration: 200,
                tint: [0xff6020, 0xffa040, 0xffd060], blendMode: Phaser.BlendModes.ADD,
              }).setDepth(DEPTH.OVERLAY);
            }
            hitCount++;
          }
        }
        if (hitCount > 0) {
          this.cameras.main.shake(70, 0.004);
          this.events.emit('update-stats', this.player.playerStats);
        }
      }
    }

    // ── Enemy AI & collision ───────────────────────────────────────────────
    const px = this.player.worldX, py = this.player.worldY;
    for (const e of this.enemies) {
      if (!e.alive) continue;

      const result = e.updateAI(delta, px, py);

      // Collision-checked movement
      if (result.desiredDX !== 0 || result.desiredDY !== 0) {
        const nx = e.worldX + result.desiredDX;
        const ny = e.worldY + result.desiredDY;
        if (this.isTileWalkable(Math.floor(nx), Math.floor(ny))) {
          e.worldX = nx; e.worldY = ny;
        } else {
          if (this.isTileWalkable(Math.floor(e.worldX + result.desiredDX), Math.floor(e.worldY)))
            e.worldX += result.desiredDX;
          if (this.isTileWalkable(Math.floor(e.worldX), Math.floor(e.worldY + result.desiredDY)))
            e.worldY += result.desiredDY;
        }
      }

      // Sync screen position
      const s = this.isoToScene(e.worldX, e.worldY);
      e.syncToScreen(s.x, s.y, depthOf(e.worldX, e.worldY));

      // Enemy hits player
      if (result.playerHit && this.player.isAlive()) {
        const dmg = this.player.takeDamage(result.damage);
        if (dmg > 0) {
          this.showDamageNumber(px, py - 0.5, dmg, '#ff3030');
          this.cameras.main.shake(50, 0.006);
          this.events.emit('update-stats', this.player.playerStats);
        }
      }
    }

    // ── Ember pickups ─────────────────────────────────────────────────────
    for (let i = this.emberPickups.length - 1; i >= 0; i--) {
      const p = this.emberPickups[i];
      const d = Math.hypot(px - p.worldX, py - p.worldY);
      if (d < 0.8) {
        this.player.playerStats.embers += 1;
        p.sprite.destroy();
        this.emberPickups.splice(i, 1);
        this.events.emit('update-stats', this.player.playerStats);
        // Collection particle
        const cs = this.isoToScene(p.worldX, p.worldY);
        this.add.particles(cs.x, cs.y - 6, 'particle_ember', {
          speed: { min: 15, max: 35 }, angle: { min: 0, max: 360 },
          lifespan: 400, scale: { start: 1, end: 0 }, quantity: 5, duration: 50,
          tint: [0xff8020, 0xffc060], blendMode: Phaser.BlendModes.ADD,
        });
      }
    }

    // ── Chest interaction (priority over exit) ────────────────────────────
    let chestInteracted = false;
    for (const chest of this.chests) {
      if (chest.opened) continue;
      const d = Math.hypot(px - chest.worldX, py - chest.worldY);
      if (d < 1.1 && inp.interact) {
        chest.opened = true;
        chest.sprite.setTexture('prop_chest_open');
        const embers = Phaser.Math.Between(8 + this.depth, 15 + this.depth * 2);
        const hpHeal = Math.floor(this.player.playerStats.maxHp * 0.25);
        this.player.playerStats.embers += embers;
        this.player.playerStats.hp = Math.min(this.player.playerStats.maxHp, this.player.playerStats.hp + hpHeal);
        this.events.emit('update-stats', this.player.playerStats);
        const cs = this.isoToScene(chest.worldX, chest.worldY);
        this.add.particles(cs.x, cs.y - 8, 'particle_ember', {
          speed: { min: 20, max: 55 }, angle: { min: 0, max: 360 },
          lifespan: 700, scale: { start: 1.5, end: 0 }, quantity: 12, duration: 120,
          tint: [0xff8020, 0xffc060, 0xffd080], blendMode: Phaser.BlendModes.ADD,
        });
        this.showDamageNumber(chest.worldX, chest.worldY - 0.5, embers, '#ffd060');
        chestInteracted = true;
        break;
      }
    }

    // ── Exit proximity ────────────────────────────────────────────────────
    const exitDist = Math.hypot(px - this.exitWorldX, py - this.exitWorldY);
    const newNearExit = exitDist < 2.0;
    if (newNearExit !== this.nearExit) {
      this.nearExit = newNearExit;
      this.events.emit('exit-prompt', newNearExit);
    }
    if (!chestInteracted && this.nearExit && inp.interact) {
      this.exitDungeon();
    }

    // ── Player death ──────────────────────────────────────────────────────
    if (!this.player.isAlive() && !this.exiting) {
      this.exiting = true;
      this.cameras.main.fadeOut(1200, 80, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        // Restore partial HP, keep embers (death penalty)
        this.player.playerStats.hp = Math.floor(this.player.playerStats.maxHp * 0.3);
        this.player.playerStats.embers = Math.max(0, this.player.playerStats.embers - 5);
        this.game.registry.set('playerStats', { ...this.player.playerStats });
        const ui = this.scene.get('UIScene') as any;
        this.scene.start('HubScene');
        this.time.delayedCall(100, () => {
          const hub = this.scene.get('HubScene');
          if (hub && ui?.bindToScene) ui.bindToScene(hub);
        });
      });
    }

    this.events.emit('update-stats', this.player.playerStats);
  }
}
