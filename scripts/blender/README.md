# Tideform glTF kits (Blender → glTF)

Two kits ship under `public/models/`:

| Kit | Path | Loaded by |
| --- | --- | --- |
| Saurian creature | `public/models/saurian-kit.glb` | `SaurianKit.tsx` / `Creature.tsx` |
| Coastal props | `public/models/coastal-props.glb` | `CoastalDress.tsx` via `CoastalPropsKit.tsx` |

Coordinate system matches the R3F scene: **+Y up, +Z forward**. The exporter uses glTF `+Y up`.

---

## Coastal props

Hero set dressing (rocks, driftwood, kelp, shells, grove trees, scrub, reeds) is a unit-space glTF kit. Worldgen still instances the same poses; only the shared mesh changes. Collision cylinders stay on pose scale (`sx`/`sz` rocks, `sy`/`sx` wood) — do not retarget radii from mesh bounds.

### Re-export

Needs Node 20+ (committed path; no Blender required):

```bash
npm run props:build
# or: node scripts/blender/build_coastal_props.mjs --out public/models/coastal-props.glb
```

Artist rebuild with **Blender 4.2+**:

```bash
blender --background --python scripts/blender/build_coastal_props.py
```

Keep object **names** stable — `COASTAL_PROP_NODES` in `src/lib/game/worldgen/props-kit.ts` looks them up.

| Node | Replaces | Local space |
| --- | --- | --- |
| `prop_rock_dry` / `_wet` / `_shelf` | dodecahedron r=1 | unit weathered stone |
| `prop_shell` | sphere r=1 | ridged clam |
| `prop_spiral` | torus r=1, tube 0.36 | XY-plane moon-snail |
| `prop_kelp` | cone r=1, h=1 | wavy blade |
| `prop_driftwood` | cylinder r=1, h=1 | gnarled Y-up log |
| `prop_trunk` | cylinder r=1 / 1.18, h=1 | bark-tapered pine |
| `prop_crown` / `prop_canopy` / `prop_scrub` | icosa / cone r=1 | lumpy wind-bent foliage |
| `prop_reed` | cone r=1, h=1 | three-blade clump |

Poly target: mid-poly PS3-era, about 70–320 tris per mesh, **one draw call per kind**. Grass / foam / haze / tide-pool discs stay cheap primitives. Mobile still uses `DENSITY.mobile` (~half the desktop instance caps). Untextured — engine Phong in `CoastalDress` keeps salt-light finishes.

iOS Safari is the performance ceiling. Do not add unique meshes per instance, 4k maps, or extra shadow casters.

---

## Saurian kit

Creatures are authored as a single glTF 2.0 kit at `public/models/saurian-kit.glb`. The live game loads named nodes with drei `useGLTF` and swaps editor parts without touching gameplay.

## Re-export

Needs **Blender 4.2+** (4.2.23 LTS used here) with the bundled glTF exporter.

From the repo root:

```bash
blender --background --python scripts/blender/build_saurians.py
```

Custom output path:

```bash
blender --background --python scripts/blender/build_saurians.py -- \
  --out public/models/saurian-kit.glb
```

The script also rewrites `src/lib/game/saurian-sockets.ts` (attach points + leg drop). Do not hand-edit that file.

## What it builds

| Node prefix | Role |
| --- | --- |
| `chassis_sleek` / `plump` / `spiky` | Theropod, sauropod, stego-like bodies + signature Spore accents (shells, plates, horns) |
| `legs_*` | One left-style limb at the hip origin; the game mirrors it |
| `mouth_*` / `eyes_*` / `arms_*` / `tail_*` / `accessory_*` | Modular editor slots |

Coordinate system matches the R3F scene: **+Y up, +Z forward**. The exporter uses glTF `+Y up`.

## Editing by hand

1. Open a new Blender file, File → Append from a run of this script, or import the GLB.
2. Keep object **names** stable — `Creature.tsx` looks them up.
3. Materials named `mat_skin`, `mat_keratin`, `mat_plate`, `mat_wet`, `mat_eye`, `mat_pupil`, `mat_cream`, `mat_claw` map to in-engine Phong finishes.
4. Export glTF 2.0 (`.glb`), **+Y Up**, Apply Modifiers, no cameras/lights. Skip Draco unless you also ship a decoder.

Poly target: mid-poly PS3-era (about 1–2k tris per chassis after one subsurf). iOS Safari is the performance ceiling — do not bake 4k maps or heavy skinning.

## Animation (walk / idle / eat)

The kit is **unskinned**. Runtime motion is procedural in `src/lib/game/anim.ts` (applied by `src/components/game/useCreatureAnim.ts`): hip swing, foot lift, body bob/roll, tail sway, idle breath/look, and jaw open tied to `sim.eatFlash`.

Keep node names stable so the pose binder can find `*_lower` / `*_pad` jaws:

| Name fragment | Motion |
| --- | --- |
| `legs_*` root | Hip pitch + lift (game mirrors L/R) |
| `mouth_*_lower` or `*_pad` | Bite / nibble |
| `tail_*` root | Counter-sway |

### Optional: export armature clips later

Procedural is the iOS-safe default (no IK, no per-frame skinning). If you add clips in Blender:

1. Build a **per-part** armature (one for `legs_stilts`, one for `mouth_maw`, …) parented to the existing empties. Do not merge the whole kit into a single skinned character — the editor still swaps nodes.
2. Name actions `idle`, `walk`, `trot`, `eat`. Loop idle/walk/trot; eat is one-shot.
3. Re-export with animations on:

```python
export_animations=True
export_nla_strips=True
export_skins=True
```

4. In `tickAnim`, keep the procedural pose as fallback. A clip mixer can replace `legCycle` when `gltf.animations` contains those names.
5. Re-run `build_saurians.py` and sanity-check `saurian-sockets.ts` (attach points must not drift).

Do not add a full IK solver for Safari landscape — foot height comes from collision (`sim.y` / `groundHeight`). Props use `sampleGroundY` in `src/lib/game/worldgen/ground.ts`, which collision binds to `surfaceHeight`.

## Knobs

- Silhouette rings live in `build_theropod` / `build_sauropod` / `build_stego` inside `build_saurians.py`.
- Engine tints still come from `src/lib/game/catalog.ts` (seafoam / sage / cream).
- Coastal scale/bump maps stay in `src/lib/game/creature-look.ts`.
