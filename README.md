# EMBERHOLD

> *"The ember fades. The dark remembers."*

A browser-based isometric action RPG. Dark fantasy. Dying world. Last light beneath.

Built with **Phaser 3 + Vite + TypeScript**.

---

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Controls

### Desktop
| Key | Action |
|-----|--------|
| `W A S D` or Arrow Keys | Move |
| `E` | Interact / Talk |
| `Space` | Attack |
| `I` | Inventory |
| `M` | Map |
| `Esc` | Pause |

### Mobile
A virtual joystick appears in the bottom-left corner. Use the ⚔ button to attack and the `E` button to interact.

### Playing on Your Phone (Local Network)

When you run `npm run dev`, Vite exposes the server on your local network. To play on your phone:

1. Find your computer's local IP:
   - **Mac**: System Settings → Wi-Fi → Details → IP Address
   - **Windows**: Run `ipconfig` → look for `IPv4 Address`
   - **Linux**: Run `ip addr` or `hostname -I`

2. Make sure your phone is on the **same Wi-Fi** as your computer.

3. Open your phone's browser and go to:
   ```
   http://YOUR_COMPUTER_IP:3000
   ```
   For example: `http://192.168.1.42:3000`

4. The virtual joystick will appear automatically on touch devices.

> **Tip:** Add to your phone's home screen (Safari: Share → Add to Home Screen; Chrome: ⋮ → Add to Home Screen) for a full-screen experience without browser chrome.

---

## Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

The built files go to `dist/`. You can serve them from any static host (Netlify, Vercel, GitHub Pages, etc.).

---

## Project Structure

```
src/
  main.ts              — Phaser game init
  config.ts            — Game constants
  scenes/
    BootScene.ts       — Procedural texture generation (all art)
    PreloadScene.ts    — Loading screen
    TitleScene.ts      — Title screen with ember effects
    HubScene.ts        — The town of Emberhold (isometric)
    UIScene.ts         — HUD overlay (HP/stamina/mana/embers)
  entities/
    Player.ts          — Player movement, animation, stats
  systems/
    InputManager.ts    — Keyboard + joystick input
  ui/
    VirtualJoystick.ts — Mobile touch joystick
  utils/
    IsoMath.ts         — Isometric coordinate math
    ColorPalette.ts    — Ember/shadow color palette
    Easing.ts          — Animation helpers
  data/
    lore.ts            — World lore, dialogue, item descriptions
```

---

## Phase Roadmap

- [x] **Phase 1** — Foundation: title screen, isometric hub town, player movement, mobile joystick
- [ ] **Phase 2** — Hub town: Tiled map, NPC dialogue system, day/night cycle, lighting
- [ ] **Phase 3** — Combat: layered sprites, combos, dodge, 3 enemy types, HUD
- [ ] **Phase 4** — Dungeon: procedural rooms, 10 enemy types, boss, minimap
- [ ] **Phase 5** — Systems: shops, relics, quests, crafting, save/load
- [ ] **Phase 6** — Polish: cutscenes, audio, bestiary, achievements

---

## Credits

See [CREDITS.md](CREDITS.md).
