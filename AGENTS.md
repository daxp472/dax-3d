# AGENTS.md — Bruno 2.0 Crew Folios

Drop this file into any AI agent session working on this repo. Read it **before** writing code.

This monorepo contains interactive WebGPU / Three.js portfolios inspired by Bruno Simon’s folio — **our branded builds**, not a claim on Bruno’s original work.

---

## 0. Agent operating rules (non-negotiable)

### Capability gate — refuse when you cannot deliver
- If the task needs real-time visual QA in the browser and you cannot see/drive the scene, say so and ask for a screenshot or exact coords — **do not pretend it looks fine**.
- If the task needs GPU/WebGPU profiling you cannot run, say so.
- If the task needs secrets, production credentials, or force-push to `main`, refuse unless the user explicitly overrides in that message.
- If you lack enough map/asset data to place props without guessing, stop and ask. Wrong placement that “looks busy” is a failure.
- **Do not invent GLB assets that do not exist.** Prefer procedural box toys (`VoxelPatron`, `ToyCritters`) or existing `static/` models.

### No sycophancy — answer like a senior engineer
- Do **not** pad answers with “great idea”, “love this”, “awesome”, or praise to make the user feel good.
- Do **not** agree with a bad plan. Push back with the technical reason and a better option.
- Do **not** mark work “done / perfect / production-ready” unless tests/build (or the user’s visual check) support it.
- Prefer short, direct status: what broke, what you changed, what still needs eyes.
- If the user is wrong about a coord, system, or cause — correct them with evidence from the code.

### Scope discipline
- Touch only files required by the request.
- Do not “also refactor” Dressing, Physics, or World init for style.
- Keep `folio-dax-patel` and `folio-samir-singh` identities separate unless the user asks to mirror a specific change.
- Do not commit or push unless the user explicitly asks.
- Do not skip hooks, amend published commits, or force-push `main`/`master`.

### When stuck
1. State the blocker in one sentence.
2. List what you already verified.
3. Ask for the smallest missing input (screenshot, world XYZ, repro steps).
4. Do **not** thrash with speculative decorative props.

---

## 1. Repo layout

| Path | Role |
|---|---|
| `folio-dax-patel/` | Dax Patel folio (Vite app) — has `World/Dressing/`, Soft Stack, RiverShore, Netlify |
| `folio-samir-singh/` | Samir Singh folio (Vite app) — parallel core, **no** Dax Dressing pack |
| `server/` | Shared WebSocket backend (whispers + circuit leaderboard), port `8787` |
| `CHANGELOG.md` | Shipping log |
| `LICENSE` | Attribution required |
| `README.md` | Human overview |

Each folio is a **separate** Vite app (`package.json`, `sources/`, `static/`, `resources/`, `scripts/`).

Remote (typical): `https://github.com/daxp472/dax-3d.git`

---

## 2. How to run

### Dax
```bash
cd folio-dax-patel
npm install --force   # or .npmrc legacy-peer-deps=true
cp .env.example .env  # if needed
npm run dev
```
Vite: `root: sources/`, `publicDir: ../static/`, `outDir: ../dist`, host open, default port **5173**.

### Samir
```bash
cd folio-samir-singh
npm install --force
npm run dev
```

### Whispers server
```bash
cd server && npm install && npm run dev
# folio .env → VITE_SERVER_URL=ws://localhost:8787
```
Health: `http://localhost:8787/health`

### Useful scripts (Dax)
| Script | Purpose |
|---|---|
| `npm run build` | Production Vite build |
| `npm run test:race-npc` | Circuit rival path math (expect 16 pass) |
| `npm run validate:npcs` | NPC data validation |
| `npm run compress` | Compress `static/` |
| `npm run extract:circuit-track` / `merge:drive-tracks` | Track tooling |

---

## 3. Architecture (top → bottom)

```
sources/index.js
  → Game.js (singleton)
       Quality, ResourcesLoader, View, Terrain, Physics, Map, …
       World.step(0) → Grid + Intro
       World.step(1) after assets/Rapier → Trees, Bushes, Flowers, Scenery, Areas, VoidPortal
       Reveal → World.step(2) → Whispers
```

| System | Path | Notes |
|---|---|---|
| Game | `sources/Game/Game.js` | Singleton; constructs systems; `window.game` if `VITE_GAME_PUBLIC` |
| World | `sources/Game/World/World.js` | Stepped init; stashes vehicle chassis **before** VisualVehicle reparents GLTF |
| Areas | `sources/Game/World/Areas/` | From `areas.glb` children by name: bowling, social, altar, landing, … |
| Dressing | `sources/Game/World/Dressing/` | **Dax-only** vibe overlays (patrons, beach, river, Soft Stack) |
| Physics | `sources/Game/Physics/` | Rapier; categories `floor` / `object` / `bumper` |
| Map | `sources/Game/Map.js` | Modal pins from respawns (+ Dax extras) |
| Quality | `sources/Game/Quality.js` | `0` high / `1` low; weak-device + auto FPS downgrade |
| Terrain | `sources/Game/Terrain.js` | PNG channels; beach grass clear uniforms |
| Respawns | `sources/Game/Respawns.js` | GLB empties + code extras (`riverBank`, `beachClub`, `softStack`) |

### Dressing wiring (Dax)
- `BowlingArea` → `BowlingLounge`, `BowlingBeach`, `RiverShore`
- `AltarArea` → `AltarApproach`
- `SocialArea` → `SocialPlaza`
- `ProjectsArea` → `ProjectsLounge`
- `LandingArea` → `GamerCornerDressing`, Guestbook, `LetterBuilder`
- `ToiletArea` → `ToiletTrail`
- `World` → `VoidPortal` → `PocketDimension` (Soft Stack)

---

## 4. Critical world coords (Dax)

| Place | Approx XYZ | File |
|---|---|---|
| Beach Club | pad `(-27.4, 74.3)` · **TP** `(-27.4, 70.6)` clear sand | `BowlingBeach` / `Respawns.beachClub` |
| River Bank | pad `(-48, 81)` · **TP** `(-48, 78.2)` | `RiverShore.js` / `Respawns.riverBank` |
| Soft Stack pocket | origin `(420, 0, 420)`, half `24` | `PocketDimension.js` |
| Void portal mouth | `(75.34, -0.5, -27.95)` | `VoidPortal.HOLE` |
| Soft Stack map pin | RETURN `(74.79, -14.08)` rot `1.12` — not the hole | `Respawns.softStack` |
| Portal return | `(74.79, 4, -14.08)` rot `1.12` | `VoidPortal.RETURN` |
| Bowling couches | `y≈1.11`, z `59.47`, x `-1.18 / 2.49 / 8.5` | `mapItemLocations.json` |
| Bowling stools | `y≈0.82`, `(4.82|7.28, 73.8)` | same |

Authoring reference (not runtime): `sources/data/mapItemLocations.json` from `scripts/locate-map-items.js`.

---

## 5. VoxelPatron — seating rules (read before moving people)

**File:** `Dressing/VoxelPatron.js`

- Legs start **vertical** (standing); sit poses bend thighs forward + bodyDrop onto seat.
  **Do not** apply huge extra negative leg rotations or people sink into furniture.
- Poses: `standing` | `booth` | `stool` | `lounger` | `fishing`
- World `position.y` is group origin (feet when standing). For sit on real furniture ≈ seat top minus small bodyDrop offset:
  - Booth/couch ≈ **`y: 1.05`**
  - Stool ≈ **`y: 0.92`**
  - Fishing with built-in stool ≈ dock deck top (`y: 0.32`)
- Car-hit knockback lives on the patron; **do not** add fixed colliders on knockable patrons (blocks fly-off).
- Always pass `playerPos` into `patron.update(elapsed, playerPos)`.

---

## 6. Beach / foliage clearing

Beach center must stay clear of trees/bushes/flowers:

1. Shader grass kill — `Terrain.js` `beachClearCenter/Inner/Outer` + `riverClearCenter/Inner/Outer` (elliptical shore strip)
2. Beach **map TP** uses clear sand `BowlingBeach.SPAWN` / `Respawns.beachClub` — never prop ORIGIN
3. Beach props sit on a **ring**; keep pad center empty for drive-in
4. Bush hide — `world.bushes.foliage.hideNear(center, radius)` 
   **Bug note:** Foliage does **not** use `mesh.instanceMatrix`. It uses a custom `foliage.instanceMatrix` buffer. Writing `mesh.setMatrixAt` does nothing.
5. Flower hide — `world.flowers.hideNear(center, radius)` (same custom-buffer pattern)
6. Tree hide — `birchTrees/oakTrees/cherryTrees.hideNear(center, radius)`
7. Retry clear with `ticker.wait` — instances can settle late

Do not plant decorative palms in the **middle** of the pad; keep edge-only if needed.
Do not put Beach Club `InteractivePoints` on top of loungers — the Enter/A key icon reads as a broken character head.
**Never** add raised ground meshes (sand pads, torus ripples, fake roads) above physics floor y≈0 — the car will sit on Rapier floor and tires will clip through your visuals. Beach color = Terrain/Floor tint only.
**Every solid beach/river prop needs a Rapier `fixed` collider** (`objects.add` cuboid). Flat towels/decals must be paper-thin (`y≈0.002`) with **no** collider. Ghost mats at player coords like `(-34, 78)` are bugs — picnic platforms must collide.

---

## 7. Inferno pocket / portal invariants

- Inferno is a **lava hell arena at ground Y** `(420, 0, 420)` — throne north, exit gate south.
- Camera **focus Y stays `0`** (`View` / `VoidPortal`). Never put spawn Y into focus Y.
- Portal mouth stays clear of altar mesh center `(75.34, −27.95)`.
- VoidPortal failure is non-fatal — World continues.
- Enter sets blood-red fog override; exit restores day cycle.
- **Exit is interact-only** at north gateway (`EXIT_Z = -20`). Never auto-teleport on proximity.
- **Entry** spawns south (`ENTRY_Z = 16`). Full arena floor collider prevents fall-through to main world.
- Gobkit CC0 GLBs (`hellMinionGuard/King/Flyer`) for denizens — not procedural cartoons.

---

## 8. Vehicle / race NPCs

- Stash chassis/wheel templates in `World.stashVehicleChassisTemplate()` **before** `VisualVehicle` reparents the GLTF.
- Race NPC clones must use the stash, not `resources.vehicle.scene`.
- After race math changes: `npm run test:race-npc`.

---

## 9. Quality / weak laptop

- Auto low quality + optional bottom banner → 2D site:
  - Dax: `https://dax-patel.in`
  - Samir: `https://samirsir-portfolio.vercel.app`
- Options row: `.js-portfolio-link`
- Low tier cuts DPR, grass subdiv, patron LOD.

---

## 10. Deploy

Dax Netlify (`folio-dax-patel/netlify.toml`):
- `base = folio-dax-patel`, `publish = dist`, Node 22
- `NPM_FLAGS=--legacy-peer-deps` (Vite 7 vs `vite-plugin-restart`)

Prod whispers: deploy `server/`, set `VITE_SERVER_URL=wss://…`.

---

## 11. Verify before claiming done

Minimum for Dressing / gameplay changes:
```bash
cd folio-dax-patel
npm run test:race-npc
npm run build
```
Then ask the user to visually check seats, beach clear, and portal enter/exit if those areas changed.

---

## 12. Don’ts (hard)

1. Don’t put Soft Stack / pocket spawn high in the sky.
2. Don’t set camera focus Y ≠ 0.
3. Don’t merge Dax Dressing into Samir unless asked.
4. Don’t strip LICENSE / Bruno attribution.
5. Don’t invent missing animal/boat GLBs — procedural only unless assets are added properly.
6. Don’t leave patrons clipping chairs — fix pose + seat Y, don’t “hide” with scale hacks.
7. Don’t mark beach “cleared” if only bushes were zeroed and trees remain.
8. Don’t praise the user instead of shipping correctness.

---

## 13. Quick path index (Dax)

```
folio-dax-patel/sources/index.js
folio-dax-patel/sources/Game/Game.js
folio-dax-patel/sources/Game/World/World.js
folio-dax-patel/sources/Game/World/Areas/*.js
folio-dax-patel/sources/Game/World/Dressing/
  VoxelPatron.js  ToyCritters.js  BowlingBeach.js  BowlingLounge.js
  RiverShore.js   PocketDimension.js  VoidPortal.js  …
folio-dax-patel/sources/Game/{Terrain,Map,Quality,Respawns,View,Physics}.js
folio-dax-patel/vite.config.js
folio-dax-patel/netlify.toml
server/src/index.js
```

When in doubt: read the file, cite the constant, then edit. Guessing coords is how chairs eat people.
