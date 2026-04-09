// ─── EMBERHOLD Game Configuration ───────────────────────────────────────────

export const GAME_W = 480;
export const GAME_H = 270;

// Tile dimensions (isometric diamond)
export const TILE_W = 64;
export const TILE_H = 32;
export const TILE_HALF_W = TILE_W / 2;
export const TILE_HALF_H = TILE_H / 2;

// Player
export const PLAYER_SPEED = 120; // pixels per second (world space)
export const PLAYER_DEPTH_OFFSET = 0.5; // for depth sorting

// Camera
export const CAM_LERP = 0.08;

// Hub map dimensions
export const HUB_COLS = 30;
export const HUB_ROWS = 30;

// Depth layers (for rendering order)
export const DEPTH = {
  GROUND: 0,
  SHADOW: 10,
  ENTITY_BASE: 100,
  PLAYER: 500,
  OVERLAY: 900,
  HUD: 1000,
  DIALOGUE: 1100,
  FADE: 1200,
} as const;

// Scene keys
export const SCENE = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  HUB: 'HubScene',
  DUNGEON: 'DungeonScene',
  UI: 'UIScene',
  DIALOGUE: 'DialogueScene',
  GAMEOVER: 'GameOverScene',
} as const;

// Storage
export const SAVE_KEY = 'emberhold_save';

// Starting stats
export const BASE_STATS = {
  hp: 100,
  maxHp: 100,
  stamina: 80,
  maxStamina: 80,
  mana: 60,
  maxMana: 60,
  attack: 12,
  defense: 5,
  speed: 1.0,
  embers: 0,
  xp: 0,
  level: 1,
};
