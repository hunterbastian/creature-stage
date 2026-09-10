# Tideform

A Spore-inspired **creature stage** toy: assemble a modular critter from simple geometry, walk it around a tiny 3D meadow, and eat glowing fruit to grow and unlock new part slots.

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
npm run build
npm start          # production server after build
```

## Controls

| Input | Action |
| --- | --- |
| `W` / `↑` | Walk forward |
| `S` / `↓` | Walk backward |
| `A` / `←` | Turn left |
| `D` / `→` | Turn right |
| Walk into fruit | Eat (grows the creature, may unlock a slot) |
| Editor (right) | Swap body / legs / mouth / eyes / later arms, tail, accessory |
| **Mutate** | Randomize every unlocked slot |
| **Reset** | Fresh sporling and a new fruit scatter |

The camera is a third-person chase cam behind whatever you built.

## Mobile play (iPhone)

Built to be played in **landscape** on iPhone Safari:

- Rotate to landscape. Portrait shows a light “Rotate for Tideform” hint (you can dismiss it).
- **Left stick** walks and turns. **Eat** on the right nibbles nearby fruit (walking into fruit still works).
- **Editor** is a collapsible bottom sheet with large part taps — it stays out of the stick / eat corners.
- The page is full-viewport and safe-area aware (notch / home indicator). Pinch-zoom and page-scroll are blocked while you play; pixel ratio is capped so the meadow does not melt an iPhone GPU.

Add the page to your Home Screen if you want a more app-like fullscreen, then keep the phone sideways.

## What shipped (v0)

- Full-screen meadow island with lighting, sky, grass tufts, rocks, and mushrooms — all primitive meshes, no heavy assets.
- A modular creature: **body, legs, mouth, eyes**, plus unlockable **arms, tail, and accessory**. Each slot has a few visually distinct parts that also tweak speed and bite radius.
- Live editor: swapping a part updates the 3D mesh immediately.
- Survival nibble loop: 8 fruits in the world, they respawn after you eat them. Meals increase size, shift speed, and unlock slots at 3 / 6 / 9 bites.
- Landscape-first mobile HUD with a virtual stick, eat button, and compact part editor.

## Project map

| Path | Role |
| --- | --- |
| `src/app/` | App Router layout + page |
| `src/components/game/` | R3F canvas, world, creature, food, camera, movement loop |
| `src/components/ui/` | Overlay editor, touch stick, rotate hint, stats, toasts |
| `src/lib/game/` | Part catalog, derived stats, zustand store, input, sim refs |

Locomotion (`x`, `z`, `yaw`) lives in `src/lib/game/sim.ts` instead of React state so the HUD does not rerender every frame.

## What's next

- Shareable DNA strings and a gallery of saved body plans
- IK / better walk cycles, idle fidgets, and eat animations
- Other critters in the pond (shy herds, a bully)
- Nest / egg as a “stage clear” beat
- Sound and a part-color picker
