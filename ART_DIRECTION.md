# Tideform — Locked Art Direction & Engine Feel

**Status:** Locked 2026-09-10. Do not drift without an explicit player decision.

**Product name:** Tideform  
**Repo slug (for now):** `creature-stage` (rename to `tideform` pending)

---

## One-liner

A sunny coastal creature stage: **dinosaur bodies** with **Spore-like modular accents**, rendered in **PS3 Skyrim-era** fidelity, playing with **Skyrim / Elden Ring mechanical weight** — never dark-fantasy gothic art, never candy vinyl toys.

---

## Art (what it looks like)

### Creatures
- **Silhouette:** Saurian — Theropod, Sauropod, Stegosaurus-like (three starters).
- **Modularity:** Spore-like attachable accents (spiral shells, osteoderms, eye rings, soft parts) on dinosaur chassis.
- **Palette:** Seafoam / teal over cream / bone; muted coastal naturals.
- **Surface:** Soft-real skin with tasteful scale detail; **aesthetic coastal beauty** (salt light, slight weather).
- **NOT:** Candy pastel toys, grimy scars/wounds, Elden Ring gothic ornate dark fantasy, PS2 ultra-flat low-poly, museum fossils.

### World
- Coastal meadow meeting shore: tide pools, wet rock, driftwood, kelp, mist, shell scatter.
- **Small shoreline groves** (wind-bent pines/scrub clusters along beach–meadow edges) — not deep inland forest.
- Nests and herds placed as part of the landscape.
- Lighting: soft bloom, hazy depth, warm-cool coastal day — Skyrim-PS3 mood without Nordic gloom as default.

### Nests & hollows
Authored **rest landmarks**, not floating props. Each hollow is a packed-earth scoop with a woven reed bowl, a clutch of eggs, and a soft salt-light rim.

- **Bowl:** Walkable floor and moss rim share the collision profile (`nestBowlHeight`) — a berm you climb, a lining you settle into.
- **Weave:** Crossing reed dress (torus + rim sticks) in species cream / seafoam / dry-tan. Tide warren picks up kelp; Bramble croft a few extra dry twigs.
- **Eggs:** Nestled on the lining, salt spec, faint warmth — not candy orbs hovering in air.
- **Rim light:** Soft coastal bloom on the crest (warmer at home, seafoam when a wild nest is claimable). Not a neon quest ring.
- **Ground depression:** Worn meadow stain + darker packed scoop under the bowl. The island mesh stays a height field; the hollow is authored geometry.
- **Home hollow:** Driftwood stake and a spiral shell. Wild nests keep the same bowl language without the marker.
- **Do not:** Dirt craters in the island mesh, vinyl toy nests, gothic braziers, changing claim/rest radii or nest-floor collision.

### Rendering target
- **PS3 Skyrim-era:** mid-poly, soft bloom, slightly soft textures, 2011 console fidelity.
- Prefer readable silhouettes over modern UE5 photoreal.
iOS Safari landscape must stay performant (DPR caps, shared materials, restrained foliage).

---

## Feel (how it plays)

Borrow **mechanical** DNA from Skyrim / Elden Ring — not their art:

- **Weight & impact** on walk, camera, eat, form-up, nest claim, herd encounters (inertia, hitstop, camera settle).
- **Breath / stamina rhythm** for trot/sprint so movement has cadence.
- **Tension & respect:** low forms get chase/flee pressure; high forms get herd honor; solitude increases with rank.
- **Herd solitude curve:** mates shrink as forms rise; **Apex = 1 other** nestmate.
- **Discovery:** compass / soft focus toward objectives; sparse UI, not arcade spam.
- Upgrades over time (forms): Hatchling → Fledgling → Wanderer → Tideborn → Elder → Apex.

---

## Platform

- Primary play target: **iOS Safari landscape** + desktop.
- Touch stick + actions; safe areas; no page zoom/scroll fights.

---

## Do / Don't cheat sheet

| Do | Don't |
| --- | --- |
| Saurian + Spore accents | Pure blobs / cute dolls |
| Coastal salt-light beauty | Muddy grimdark / Elden Ring gothic |
| PS3 Skyrim mid-fi | Hyperreal 2020s or PS2 chunk cubes |
| Weighty actions | Floaty arcade |
| Shoreline groves | Dense temperate forest walls |
| Lonely Apex herd (1 mate) | Stadium flocks at Apex |

---

## Reference anchors (player-approved)

- Locked cliff theropod regen (seafoam/cream + spiral shells, PS3 coastal).
- Stego head E (small beaked herbivore head + spiral plates).
- HardLine Carnotaurus was an early hit for *game-asset* attitude; final look is Skyrim-mid-fi saurian, not flat PS2.
