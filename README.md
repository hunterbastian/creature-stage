# Tideform

A Spore-inspired **creature stage** toy: assemble a modular coastal saurian from a Blender glTF kit, walk it around a tiny 3D meadow, and eat glowing fruit to grow through named forms.

The GitHub repository stays `creature-stage`; the game players see is **Tideform**.

Built with Next.js (App Router), TypeScript, Tailwind CSS v4, Three.js, `@react-three/fiber`, and `@react-three/drei`.

## Run

From the repo root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app is a single full-screen scene — no extra env vars or backend.

Useful scripts:

```bash
npm run lint
npm run test          # collision height field + procedural gait
npm run build
npm start          # production server after build
```

## The loop

A short session should feel like: **pick → explore → eat/grow → nest/herd → optional edit → optional deep hunt → repeat**.

1. **Start** — Choose **Theropod**, **Sauropod**, or **Stego**. You spawn facing a nearby fruit with one job: walk into the glow.
2. **Explore** — A single objective chip + compass points at the next beat (fruit, a wild nest, or your flock). No quest log.
3. **Eat / grow** — Meals are DNA. Size and stats climb every bite; **named forms** land with a hitch, squash, and camera settle. New modular parts auto-equip when they unlock. The flock thins as you rank up.
4. **Social** — At Fledgling you can claim a wild nest. Hatchling herds flee or chase; Elder / Apex flocks **honor** you and stand aside. Apex walks with a single nestmate.
5. **Edit** — The editor stays live mid-run. **Mutate** unlocks as a Fledgling reward and randomizes unlocked parts; nestmates copy you.
6. **Deep (optional)** — Walk the far shore and a leviathan may notice. The meadow stays safe; danger lives in the water.

Teach-once toasts cover walk/eat, grow, claim, herds, editor, mutate, and the deep. They do not repeat after you have seen them.

## Upgrading (forms)

Progress reuses **meals eaten** as DNA / XP. Forms are the same for all three starters:

| Form | Meals | Nestmates | What changes |
| --- | --- | --- | --- |
| **Hatchling** | 0 | **5** | Crowded hollow, wary wild herds, fruit is the only job, **3** vitality |
| **Fledgling** | 3 | **4** | Arms unlock, size jump, **claim nests**, **Mutate** unlocks, **3** vitality |
| **Wanderer** | 6 | **3** | Tail unlock, another size jump, quieter flock, **4** vitality |
| **Tideborn** | 9 | **2** | Accessory unlock — fully dressed, flock thinning, **4** vitality |
| **Elder** | 12 | **2** | All herds **honor** you (stand aside, face you), **5** vitality, heavier bite |
| **Apex** | 16 | **1** | Session peak: one nestmate, max respect, largest form, **6** vitality |

Nestmate count is *other* creatures in your flock (player + mates). Apex is exactly **player + 1**. Wild sauropod / stego flocks stay near 3 and only thin to 2 at Elder/Apex. A nestmate walks toward the tide when the flock shrinks.

Between forms you still grow a little each meal. Form-ups are the loud moments (hitstop + squash + camera settle + toast).

## Controls

| Input | Action |
| --- | --- |
| Start picker | Choose **Theropod**, **Sauropod**, or **Stego** |
| `W` / `↑` | Walk forward (inertia — it takes a beat to start and stop) |
| `S` / `↓` | Walk backward |
| `A` / `←` | Turn left |
| `D` / `→` | Turn right |
| `Shift` | Trot (stamina). Empty bar = a short winded hitch |
| `F` or tap compass | Soft-focus the current objective (camera glance + yaw pull) |
| Walk into fruit | Eat (squash + camera kick; may form-up / unlock a slot) |
| Walk the far shore | A leviathan may notice, surge, telegraph, then slam |
| Eat / walk into a slammed beast | Bite it (recover window). Drive one off for **2 meals** |
| `E` or linger in a nest | Nestle: rest (full vitality) at home, or claim a wild nest once you are Fledgling |
| Editor (right / sheet) | Swap body / legs / mouth / eyes / later arms, tail, accessory |
| **Mutate** | Randomize every unlocked slot (after Fledgling) |
| **Reset** | Pick a new starter and a new fruit scatter |

The camera is a heavy third-person chase cam: soft follow, damped look, punch on eat/claim/chase. Not a dark-fantasy restyle — coastal Spore-saurian art stays.

## Mobile play (iPhone)

Built to be played in **landscape** on iPhone Safari:

- Rotate to landscape. Portrait shows a light “Rotate for Tideform” hint (you can dismiss it).
- **Left stick** walks and turns. Push the stick far forward to **trot** (same stamina as Shift). **Eat** on the right nibbles nearby fruit (walking into fruit still works). Standing in a nest, that button reads **Rest** or **Claim**. When a leviathan is open after a slam, it reads **Bite**.
- Tap the **compass** to focus the current objective.
- **Editor** is a collapsible bottom sheet with large part taps — it stays out of the stick / eat corners. It pulses when a new slot unlocks.
- The page is full-viewport and safe-area aware (notch / home indicator). Pinch-zoom and page-scroll are blocked while you play.
- **iPhone GPU:** pixel ratio capped at 1.15, no MSAA, 512px shadows, fewer grass/rock clumps, wildlife without extra shadow casters. Stamina and focus are rAF overlays (no per-frame React). Hatchling flock is 5 mates, not a stadium — enough solitude curve without melting Safari.

Add the page to your Home Screen if you want a more app-like fullscreen, then keep the phone sideways.

## What shipped

- Full-screen coastal meadow with Skyrim-PS3 lighting (warm sun, grass, sea).
- Three locked starters: **Theropod** (biped hunter), **Sauropod** (long-neck), **Stego** (beaked herbivore, cream spiral plates). Seafoam/cream + modular accents, loaded from a Blender glTF kit (`public/models/saurian-kit.glb`).
- A modular creature: **body, legs, mouth, eyes**, plus unlockable **arms, tail, and accessory** (named glTF nodes, live editor swaps).
- Live editor: swapping a part updates the 3D mesh immediately.
- Survival nibble loop: 8 fruits in the world (one waits in front of you), they respawn after you eat them.
- Named form progression from Hatchling to Apex, with herd-respect tiers and a shrinking flock (5 → 1 nestmate).
- Weightier locomotion (inertia, stamina trot, hitstop, **grounded collision**) and a soft-lock focus toward objectives.
- Landscape-first mobile HUD with a virtual stick, contextual eat/claim, and compact part editor.
- **Nests & herds** — three woven nest bowls with eggs; sauropod and stego flocks graze nearby, and nestmates wear your morph.
- **World collision** — meadow→beach height field, solid shore lip, walkable nest rims, light rock/driftwood slide-off. No physics engine.
- **Offshore leviathans** — Coil, Veil, Keel (and Rift on desktop) loop the far ocean. Walk the beach and one may surge, telegraph, and slam. Bite the recover window for deep marrow (2 meals). The meadow is never a death zone.

## Nests & herds

The meadow keeps living nests, Spore creature-stage style: soft woven bowls, a few eggs, and a flock that treats that hollow as home.

- You spawn at **Home hollow**. Nestmates wear your current parts when you mutate. The flock starts full (5) and thins as you form-up; Apex keeps **one**.
- **Sauropods** (shy) and **Stegos** (plucky) keep their own nests. As a Hatchling they **flee** or **chase**; the camera tightens when you are hunted.
- Nestling at a wild nest **claims** it as your rest landmark once you are Fledgling (dull sand cap). That herd turns curious instead of fleeing or chasing.
- Elder and Apex Tideforms are **honored**: flocks halt, face you, and give space — not a cute flock-follow.
- Herds wander as a group near their nest, separate so they do not stack, and move with a little inertia.

## The deep

Horizon fauna from the far ocean lane can escalate into a real shore fight. They stay majestic and distant until you step onto the outer beach (or they swim into your shore sector).

- **Aggro** — only if you are near the water (`SHORE_DANGER_RADIUS`) and a beast is in range / facing your bearing. One beast at a time. Walk inland (`SHORE_SAFE_RADIUS`) and it gives up.
- **Feel** — notice (rise + turn) → slow surge → high windup telegraph → slam. Hitstop, camera punch, knockback inland. Not twitch.
- **Fight back** — after the slam there is a recover window. Eat / Bite / walk into the maw. Coil and Veil take 3 bites; Keel takes 4; Rift takes 2. Elder / Apex bite for 2.
- **Rewards** — driving one off grants **2 meals** (same DNA / form-up path as fruit). It sinks, then returns on the horizon after a cooldown.
- **Vitality** — a thin seafoam bar (sand when low) appears when you are hurt or threatened. Home nest rest fills it. Going down wakes you at the hollow; you keep your meals.
- **iOS** — still 3 beasts (no Rift), one active AI, no extra shadows or particles. Telegraph is height + a cheap foam disc.

Knobs live in `src/lib/game/offshore.ts`. The brain is `src/lib/game/offshore-ai.ts`.

Reviewer warp: open `/#hunt`, pick a starter, and Coil stages on the +Z beach so you do not wait a full orbit. `?starter=theropod|sauropod|stego` (or `sleek|plump|spiky`) auto-picks a chassis.

## World collision

The island is no longer a flat disc with a radius clamp. Feet sample a cheap height field (meadow plateau → beach slope → waterline), then a capsule slides off major rocks/driftwood and a solid lip at the sand shelf. Nest bowls have a walkable floor and rim so the camera does not clip through the weave. Foliage is visual-only.

Aggro is still **xz radial**: `SHORE_DANGER_RADIUS` === `BEACH_INNER_RADIUS` (dry-sand start). The playable lip sits *outside* that band so you can still stand on the beach and draw a leviathan. Height is not part of the notice test.

Knobs live in `src/lib/game/collision.ts` (`MEADOW_HEIGHT`, `WATER_Y`, `SHORE_LIP_RADIUS`, `NEST_*`, `PROP_*`, settle/gravity). The displaced dirt mesh is `src/lib/game/island-mesh.ts`.

## How it should feel

Mechanical nods to Skyrim / Elden Ring, not their art:

- **Weight** — walk accelerates and coasts; feet settle onto terrain instead of hovering; the camera lags and settles instead of snapping. Stride is a planted walk (long stance, short swing), not a bounce.
- **Rhythm** — Shift / full-stick trot spends a thin breath meter, then you are winded. Trot is a slightly faster gait on the same cycle, not a cartoon skip.
- **Tension** — Hatchling vs a plucky herd is a chase; Elder/Apex is an honor stop. The deep does not honor you — the far shore is the weighty fight.
- **Discovery** — compass + a soft yaw pull; hold **F** or tap the needle to glance at the objective.
- **Impact** — eat, form-up, claim, greet, mutate, and shore slams punch the camera; the jaw opens on `eatFlash` and the body squash still shares that window (ready for audio later).
- **UI** — one objective chip, breath / vitality bars that only appear when they matter, no arcade combo spam.

## Project map

| Path | Role |
| --- | --- |
| `src/app/` | App Router layout + page |
| `src/components/game/` | R3F canvas, world, coastal dress, nests, wildlife herds, offshore fauna, creature, food, camera, movement loop |
| `src/components/ui/` | Overlay editor, starter picker, touch stick, rotate hint, stats, toasts |
| `src/lib/game/worldgen/` | Seeded coastal set dressing (biomes, density knobs, ground-Y hook) |
| `scripts/blender/` | Headless bpy generator for the saurian glTF kit; re-export notes in `scripts/blender/README.md` |

Locomotion (`x`, `y`, `z`, `yaw`, stamina, vitality, feel pulses) lives in `src/lib/game/sim.ts` and `src/lib/game/locomotion.ts` so the HUD does not rerender every frame. Visual walk/idle/trot/eat poses live in `src/lib/game/anim.ts` (applied in `useCreatureAnim.ts`). World collision (height field, shore lip, nest bowls, prop capsules) lives in `src/lib/game/collision.ts`. Wildlife x/z lives in `src/lib/game/wildlife.ts`. Leviathan moods live in `src/lib/game/offshore-ai.ts`. Form thresholds, herd-mate curve, and the current objective live in `src/lib/game/progress.ts`. Coastal set dressing is seeded in `src/lib/game/worldgen/` and drawn by `CoastalDress`. Creature roots follow collision footing (`sim.y` / `groundHeight`); props use `sampleGroundY` (collision binds that hook to `surfaceHeight`).

## World generation

The island is **seeded set dressing** on collision’s height field. Same seed → same groves, tide pools, and wrack every reload. Fruit still randomizes, but it refuses pools and rock shelves so objectives stay walkable.

| Knob | Where | Notes |
| --- | --- | --- |
| `WORLDGEN_SEED` (`0x71def04`) | `src/lib/game/worldgen/density.ts` | Bump to reshuffle the whole island. |
| `DENSITY.desktop` / `DENSITY.mobile` | same file | Per-prop instance caps. Mobile is roughly half. |
| `BAND` | same file | Meadow / grove / shore / waterline radii. Groves stay on the beach–meadow edge (no forest wall). |
| `PROP_CATALOG` | `src/lib/game/worldgen/catalog.ts` | Which props instance, which band they belong to. |
| `sampleGroundY` / `setGroundSampler` | `src/lib/game/worldgen/ground.ts` | Pose `y` is local lift. Collision binds `setGroundSampler(surfaceHeight)` so props sit on the meadow→beach field. |

Shore micro-biomes (tide terraces, kelp wrack, rock shelves, shell fans) are authored arcs in `layout.ts`, then filled with instanced props. Nest bowls keep a clearing; `isWorldgenOccupied` is the fruit keep-out. Walkable height, shore lip, and nest rims stay in `collision.ts`.

## Creature animation

The Blender kit (`public/models/saurian-kit.glb`) has no clips. Theropod / sauropod / stego (and nestmates / wildlife that share `CreatureVisual`) get:

- **Idle** — breath, tail drift, slow look; unique phase per agent so the flock is not a clone army
- **Walk** — planted stride (≈60% stance), hip swing, foot lift, body roll into the plant
- **Trot** — same cycle, slightly faster, when sprinting
- **Eat / bite** — jaw (`mouth_*_lower` or sucker pad) plus a neck dip, driven by existing `sim.eatFlash`

Tune weight in `PROFILES` inside `src/lib/game/anim.ts`. Re-export notes (and how to add real armature clips later) are in `scripts/blender/README.md`. Gait checks ride `npm test` with the collision suite.

## What's next

- Shareable DNA strings and a gallery of saved body plans
- Optional Blender clips (`idle` / `walk` / `trot` / `eat`) layered on the procedural fallback
- Sound and a part-color picker
