# Changelog

Timeline of meaningful upgrades on **dax-3d** (folio-dax-patel).  
Newest entries first.

---

## 2026-08-07 — Guest Wall, Circuit Rivals, Path Tools

### Guest Notes wall
- Cork guestbook board on the landing road with readable note cards
- Previous / Next / Open / Close interactive buttons
- Map pin “Guest Notes” focuses the camera on the wall
- Nearby trees cleared so the wall stays readable
- Featured guestbook entries data module

### Live messages + local server
- Local WebSocket server under `server/` (whispers + circuit leaderboard)
- Client reconnect hardened (no socket leak spam)
- Whisper board sync clears stale notes on reconnect

### Circuit race rivals
- NPC race cars (visual jeep clones) that start on the grid with the player
- Shared obstacle timing with the player crates
- Ranking / place label on the race end modal
- Dark asphalt material on the circuit road
- Pure math helpers + `npm run test:race-npc` (14 tests)

### Track path tools
- Baked track coords from the GLB road cuboids (`circuitTrackPath.json`)
- Extract script: `npm run extract:circuit-track`
- **F3 Track Path Recorder** — drive a lap, copy/download JSON for NPC pathing

### Stability
- Player update no longer crashes when achievements are not ready yet
- Vehicle chassis/wheel templates stashed before VisualVehicle reparents the GLTF

---

## Earlier — Monorepo baseline

- Bruno 2.0–style monorepo: Dax + Samir folios with Letter Builder (`da8eb63`)

---

## How to update this file

When you ship something visible or structural, add a dated section:

```md
## YYYY-MM-DD — Short title

### Area name
- What changed in one plain sentence
```

Keep it human. Skip tiny typos unless they mattered in production.
