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
| Start picker | Choose **Theropod**, **Sauropod**, or **Stego** |
| `W` / `↑` | Walk forward |
| `S` / `↓` | Walk backward |
| `A` / `←` | Turn left |
| `D` / `→` | Turn right |
| Walk into fruit | Eat (grows the creature, may unlock a slot) |
| `E` or linger in a nest | Nestle: rest at home, or claim a wild nest as your landmark |
| Editor (right) | Swap body / legs / mouth / eyes / later arms, tail, accessory |
| **Mutate** | Randomize every unlocked slot |
| **Reset** | Pick a new starter and a new fruit scatter |

The camera is a third-person chase cam behind whatever you built.

## Mobile play (iPhone)

Built to be played in **landscape** on iPhone Safari:

- Rotate to landscape. Portrait shows a light “Rotate for Tideform” hint (you can dismiss it).
- **Left stick** walks and turns. **Eat** on the right nibbles nearby fruit (walking into fruit still works) and nestles when you are standing in a nest.
- **Editor** is a collapsible bottom sheet with large part taps — it stays out of the stick / eat corners.
- The page is full-viewport and safe-area aware (notch / home indicator). Pinch-zoom and page-scroll are blocked while you play; pixel ratio is capped so the meadow does not melt an iPhone GPU.

Add the page to your Home Screen if you want a more app-like fullscreen, then keep the phone sideways.

## What shipped (v0)

- Full-screen coastal meadow with Skyrim-PS3 lighting (warm sun, grass, sea).
- Three locked starters: **Theropod** (biped hunter), **Sauropod** (long-neck), **Stego** (beaked herbivore, cream spiral plates). Seafoam/cream + modular accents.
- A modular creature: **body, legs, mouth, eyes**, plus unlockable **arms, tail, and accessory**.
- Live editor: swapping a part updates the 3D mesh immediately.
- Survival nibble loop: 8 fruits in the world, they respawn after you eat them. Meals increase size, shift speed, and unlock slots at 3 / 6 / 9 bites.
- Landscape-first mobile HUD with a virtual stick, eat button, and compact part editor.
- **Nests & herds** — three woven nest bowls with eggs; sauropod and stego flocks graze nearby, and nestmates wear your morph.

## Nests & herds

The meadow keeps living nests, Spore creature-stage style: soft woven bowls, a few eggs, and a flock that treats that hollow as home.

- You spawn at **Home hollow**. Nestmates wear your current parts when you mutate.
- **Sauropods** (shy) and **Stegos** (plucky) keep their own nests. Walk up for a prompt; press **E**, **Eat**, or stand still a beat to nestle.
- Nestling at a wild nest **claims** it as your rest landmark (dull sand cap). That herd turns curious instead of fleeing or chasing.
- Herds wander as a group near their nest, separate so they do not stack, and react lightly — not a combat sim.

## Project map

| Path | Role |
| --- | --- |
| `src/app/` | App Router layout + page |
| `src/components/game/` | R3F canvas, world, nests, wildlife herds, creature, food, camera, movement loop |
| `src/components/ui/` | Overlay editor, starter picker, touch stick, rotate hint, stats, toasts |
| `src/lib/game/` | Part catalog, species, wildlife sim, derived stats, zustand store, input |

Locomotion (`x`, `z`, `yaw`) lives in `src/lib/game/sim.ts` instead of React state so the HUD does not rerender every frame. Wildlife poses live in `src/lib/game/wildlife.ts` for the same reason.

## What's next

- Shareable DNA strings and a gallery of saved body plans
- IK / better walk cycles, idle fidgets, and eat animations
- Sound and a part-color picker
