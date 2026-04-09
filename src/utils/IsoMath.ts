// ─── Isometric Math Utilities ────────────────────────────────────────────────
import { TILE_HALF_W, TILE_HALF_H } from '../config';

export interface GridPos { col: number; row: number; }
export interface WorldPos { x: number; y: number; }
export interface ScreenPos { x: number; y: number; }

/**
 * Convert isometric grid cell (col, row) → screen pixel position.
 * The returned position is the TOP CENTER of the diamond tile.
 */
export function gridToScreen(col: number, row: number): ScreenPos {
  return {
    x: (col - row) * TILE_HALF_W,
    y: (col + row) * TILE_HALF_H,
  };
}

/**
 * Convert screen position → closest isometric grid cell.
 */
export function screenToGrid(sx: number, sy: number): GridPos {
  const col = Math.round((sx / TILE_HALF_W + sy / TILE_HALF_H) / 2);
  const row = Math.round((sy / TILE_HALF_H - sx / TILE_HALF_W) / 2);
  return { col, row };
}

/**
 * Convert world pixel position (continuous) → screen position.
 * World coords are in "tile units" (not pixel-grid-snapped).
 */
export function worldToScreen(wx: number, wy: number): ScreenPos {
  return {
    x: (wx - wy) * TILE_HALF_W,
    y: (wx + wy) * TILE_HALF_H,
  };
}

/**
 * Convert screen position → world position (continuous).
 */
export function screenToWorld(sx: number, sy: number): WorldPos {
  return {
    x: (sx / TILE_HALF_W + sy / TILE_HALF_H) / 2,
    y: (sy / TILE_HALF_H - sx / TILE_HALF_W) / 2,
  };
}

/**
 * Depth sort key for an entity at world position.
 * Entities with higher (col + row) render on top.
 */
export function depthOf(wx: number, wy: number): number {
  return (wx + wy) * TILE_HALF_H;
}

/**
 * Manhattan distance in grid space.
 */
export function gridDist(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

/**
 * Convert a directional velocity (dx, dy in screen/world space)
 * to one of 8 directions (N, NE, E, SE, S, SW, W, NW).
 */
export function velocityToDir(dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return 'S';
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  // 0° = East, 90° = South (screen y down)
  if (angle >= -22.5 && angle < 22.5)  return 'E';
  if (angle >= 22.5  && angle < 67.5)  return 'SE';
  if (angle >= 67.5  && angle < 112.5) return 'S';
  if (angle >= 112.5 && angle < 157.5) return 'SW';
  if (angle >= 157.5 || angle < -157.5) return 'W';
  if (angle >= -157.5 && angle < -112.5) return 'NW';
  if (angle >= -112.5 && angle < -67.5) return 'N';
  return 'NE';
}

/**
 * For isometric games, "screen direction" input (WASD) maps to
 * isometric world direction. Remap it.
 * Input: dx/dy are screen-space desire (−1..1 each axis).
 * Output: world-space dx/dy.
 */
export function screenInputToWorld(inputX: number, inputY: number): WorldPos {
  // Rotate 45° for isometric
  return {
    x: (inputX - inputY) * 0.707,
    y: (inputX + inputY) * 0.707,
  };
}
