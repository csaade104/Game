// ─── EMBERHOLD Color Palette ─────────────────────────────────────────────────
// A warm-ember / cool-shadow dual palette for the dark fantasy aesthetic

export const PALETTE = {
  // Ember / fire tones
  EMBER_CORE:    0xfff1a8,   // near-white hot center
  EMBER_BRIGHT:  0xffb347,   // bright orange flame
  EMBER_MID:     0xff6b35,   // signature ember orange
  EMBER_DEEP:    0xc0392b,   // deep red coal
  EMBER_GLOW:    0xff8c42,   // warm glow halo

  // Stone / earth tones
  STONE_PALE:    0x8a7a6a,   // light cobble
  STONE_MID:     0x5c4a3a,   // mid cobble
  STONE_DARK:    0x3a2c20,   // dark cobble / mortar
  STONE_DEEP:    0x1e1410,   // deep shadow stone
  DIRT:          0x6b4f34,   // path dirt
  DIRT_DARK:     0x4a3020,   // dark earth

  // Sky / shadow tones (cool)
  SKY_DUSK:      0x1a0d1f,   // near-black sky at dusk
  SHADOW_DEEP:   0x0d0a1a,   // deepest shadow
  SHADOW_BLUE:   0x1a2a4a,   // cool blue shadow
  SHADOW_PURPLE: 0x2a1a3a,   // purple midnight shadow
  FOG:           0x7a8ab0,   // mist / fog

  // Foliage / organic
  MOSS:          0x3d5a3a,   // dungeon moss
  WOOD_WARM:     0x7a4f2a,   // warm wood
  WOOD_DARK:     0x4a2a10,   // dark timber

  // Character / UI
  SKIN_LIGHT:    0xe8c9a0,   // skin tone
  SKIN_DARK:     0x7a5a38,   // darker skin
  HAIR_DARK:     0x2a1a0a,   // dark hair
  CLOTH_WARM:    0x8a6a3a,   // worn cloth
  CLOTH_DARK:    0x3a2a1a,   // dark cloth

  // UI chrome
  UI_BG:         0x110b0f,   // UI background
  UI_BORDER:     0x4a3020,   // UI border
  UI_ACTIVE:     0xff6b35,   // UI active / highlight
  UI_TEXT:       0xe8d5b0,   // UI text (warm white)
  UI_SUBDUED:    0x7a6a5a,   // subdued text

  // Special
  PORTAL_CORE:   0xffffff,   // portal center
  PORTAL_MID:    0xff9f45,   // portal mid ring
  PORTAL_OUTER:  0xc0392b,   // portal outer ring
  LANTERN:       0xffd166,   // lantern warm glow
} as const;

export type PaletteKey = keyof typeof PALETTE;

// Helper: convert hex number to CSS hex string
export function toCSS(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}

// Helper: convert hex number to RGBA with alpha
export function withAlpha(hex: number, alpha: number): number {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return Phaser.Display.Color.GetColor32(r, g, b, Math.floor(alpha * 255));
}

// Ember palette as array (for procedural color variations)
export const EMBER_RAMP = [
  PALETTE.STONE_DEEP,
  PALETTE.EMBER_DEEP,
  PALETTE.EMBER_MID,
  PALETTE.EMBER_BRIGHT,
  PALETTE.EMBER_CORE,
];
