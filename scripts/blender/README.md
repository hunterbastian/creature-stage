# Tideform saurian kit (Blender → glTF)

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

## Knobs

- Silhouette rings live in `build_theropod` / `build_sauropod` / `build_stego` inside `build_saurians.py`.
- Engine tints still come from `src/lib/game/catalog.ts` (seafoam / sage / cream).
- Coastal scale/bump maps stay in `src/lib/game/creature-look.ts`.
