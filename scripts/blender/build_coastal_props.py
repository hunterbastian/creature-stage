#!/usr/bin/env python3
"""Build Tideform coastal prop GLB kit (Blender 4.2, headless).

Meshes occupy the same local space as the primitives they replace so worldgen
pose scales and collision cylinders stay valid. Prefer the Node rebuild when
Blender is not installed:

    node scripts/blender/build_coastal_props.mjs

Blender:

    blender --background --python scripts/blender/build_coastal_props.py
    blender --background --python scripts/blender/build_coastal_props.py -- \\
        --out public/models/coastal-props.glb

Coordinate system matches R3F: +Y up, +Z forward. glTF export uses +Y up.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "public" / "models" / "coastal-props.glb"

MATS = {
    "prop_rock_dry": ((0.541, 0.51, 0.463, 1.0), 0.74),
    "prop_rock_wet": ((0.369, 0.408, 0.392, 1.0), 0.38),
    "prop_rock_shelf": ((0.478, 0.463, 0.424, 1.0), 0.62),
    "prop_shell": ((0.894, 0.847, 0.769, 1.0), 0.45),
    "prop_spiral": ((0.91, 0.863, 0.784, 1.0), 0.42),
    "prop_kelp": ((0.29, 0.353, 0.267, 1.0), 0.58),
    "prop_driftwood": ((0.604, 0.541, 0.439, 1.0), 0.7),
    "prop_trunk": ((0.478, 0.416, 0.322, 1.0), 0.68),
    "prop_crown": ((0.353, 0.408, 0.282, 1.0), 0.64),
    "prop_canopy": ((0.384, 0.439, 0.314, 1.0), 0.64),
    "prop_scrub": ((0.38, 0.408, 0.298, 1.0), 0.7),
    "prop_reed": ((0.361, 0.408, 0.282, 1.0), 0.6),
}


def parse_out() -> Path:
    argv = sys.argv
    if "--" in argv:
        extra = argv[argv.index("--") + 1 :]
        if "--out" in extra:
            return Path(extra[extra.index("--out") + 1]).resolve()
    return DEFAULT_OUT


def reset_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def collection() -> bpy.types.Collection:
    return bpy.context.scene.collection


def creature_to_blender(x: float, y: float, z: float) -> Vector:
    return Vector((x, -z, y))


def mat(name: str, color: tuple[float, float, float, float], roughness: float) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = 0.28
    material.diffuse_color = color
    return material


def shade_smooth(obj: bpy.types.Object) -> None:
    mesh = obj.data
    for poly in mesh.polygons:
        poly.use_smooth = True
    if hasattr(mesh, "use_auto_smooth"):
        mesh.use_auto_smooth = True
        mesh.auto_smooth_angle = math.radians(55)


def object_from_bmesh(name: str, bm: bmesh.types.BMesh, material: bpy.types.Material) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection().objects.link(obj)
    obj.data.materials.append(material)
    shade_smooth(obj)
    return obj


def noise3(x: float, y: float, z: float, salt: float) -> float:
    return (
        math.sin(x * 2.13 + y * 1.71 + salt) * 0.47
        + math.sin(x * 5.27 - z * 3.41 + salt * 1.3) * 0.31
        + math.sin(y * 7.03 + z * 4.19 - salt) * 0.22
    )


def icosphere_bm(subdiv: int, radius: float = 1.0) -> bmesh.types.BMesh:
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    return bm


def transform_creature(bm: bmesh.types.BMesh) -> None:
    for vert in bm.verts:
        mapped = creature_to_blender(vert.co.x, vert.co.y, vert.co.z)
        vert.co = mapped
    bm.normal_update()


def normalize_radius(bm: bmesh.types.BMesh, target: float) -> None:
    max_r = 0.0
    for vert in bm.verts:
        max_r = max(max_r, vert.co.length)
    if max_r < 1e-6:
        return
    scale = target / max_r
    for vert in bm.verts:
        vert.co *= scale


def displace_rock(
    bm: bmesh.types.BMesh,
    salt: float,
    jagged: float,
    squash_y: float,
    stretch_x: float,
    stretch_z: float,
    flatten: float,
) -> None:
    for vert in bm.verts:
        x = vert.co.x * stretch_x
        y = vert.co.y * squash_y
        z = vert.co.z * stretch_z
        nse = noise3(x, y, z, salt)
        nse2 = noise3(x * 1.8, y * 1.4, z * 1.6, salt + 4.2)
        bump = 1.0 + (nse * 0.16 + nse2 * 0.08) * jagged
        x *= bump
        y *= bump * (1.0 - flatten * 0.12)
        z *= bump
        if y < -0.18:
            t = min(1.0, max(0.0, (-0.18 - y) / 0.7))
            y = y + (-0.62 - y) * t * 0.72
            pinch = 1.0 - t * 0.18
            x *= pinch
            z *= pinch
        vert.co = Vector((x, y, z))
    normalize_radius(bm, 1.02)


def make_rock(name: str, material: bpy.types.Material, **kwargs: float) -> bpy.types.Object:
    bm = icosphere_bm(2, 1.0)
    displace_rock(bm, **kwargs)
    transform_creature(bm)
    return object_from_bmesh(name, bm, material)


def lathe(profile: list[tuple[float, float]], segs: int) -> bmesh.types.BMesh:
    bm = bmesh.new()
    rings: list[list[bmesh.types.BMVert]] = []
    for y, radius in profile:
        row = []
        for s in range(segs):
            ang = (s / segs) * math.tau
            row.append(bm.verts.new((math.cos(ang) * radius, y, math.sin(ang) * radius)))
        rings.append(row)
    bm.verts.ensure_lookup_table()
    for i in range(len(rings) - 1):
        for s in range(segs):
            n = (s + 1) % segs
            bm.faces.new((rings[i][s], rings[i][n], rings[i + 1][n], rings[i + 1][s]))
    return bm


def make_driftwood(material: bpy.types.Material) -> bpy.types.Object:
    rings = 12
    profile = []
    for i in range(rings):
        t = i / (rings - 1)
        y = -0.5 + t
        envelope = math.sin(t * math.pi) ** 0.55
        waist = 0.62 + 0.38 * envelope
        bark = 0.9 + 0.1 * math.sin(t * 18.0)
        end_chip = 0.72 if t < 0.08 or t > 0.92 else 1.0
        profile.append((y, waist * bark * end_chip))
    bm = lathe(profile, 8)
    for vert in bm.verts:
        x, y, z = vert.co.x, vert.co.y, vert.co.z
        t = y + 0.5
        x += 0.14 * math.sin(t * math.pi)
        z += 0.06 * math.sin(t * math.pi * 2 + 0.4)
        knot_a = math.exp(-(((t - 0.32) * 9) ** 2))
        knot_b = math.exp(-(((t - 0.68) * 10) ** 2))
        bump = 1.0 + knot_a * 0.28 + knot_b * 0.22
        groove = 1.0 + 0.05 * math.sin(math.atan2(z, x) * 6 + y * 8)
        vert.co = Vector((x * bump * groove, y, z * bump * groove))
    normalize_radius(bm, 1.12)
    transform_creature(bm)
    return object_from_bmesh("prop_driftwood", bm, material)


def make_trunk(material: bpy.types.Material) -> bpy.types.Object:
    rings = 8
    profile = []
    for i in range(rings):
        t = i / (rings - 1)
        y = -0.5 + t
        profile.append((y, 1.18 + (1.0 - 1.18) * t))
    bm = lathe(profile, 8)
    for vert in bm.verts:
        x, y, z = vert.co.x, vert.co.y, vert.co.z
        ang = math.atan2(z, x)
        bark = 1.0 + 0.055 * math.sin(ang * 8) + 0.03 * math.sin(y * 14 + ang * 3)
        vert.co = Vector((x * bark, y, z * bark * 0.96))
    transform_creature(bm)
    return object_from_bmesh("prop_trunk", bm, material)


def make_kelp(material: bpy.types.Material) -> bpy.types.Object:
    bm = bmesh.new()
    cols, rows = 3, 11
    ids: list[list[bmesh.types.BMVert]] = []
    for r in range(rows):
        t = r / (rows - 1)
        y = -0.5 + t
        width = 1.0 + (0.18 - 1.0) * (t * t)
        wave = math.sin(t * 7.2) * 0.16 * (0.35 + t)
        wave2 = math.sin(t * 3.4 + 0.6) * 0.08
        row = []
        for c in range(cols):
            u = 0.0 if cols == 1 else c / (cols - 1)
            x = -width + 2 * width * u
            z = wave + wave2 * (u - 0.5) * 2 + (u - 0.5) * 0.04
            row.append(bm.verts.new((x, y, z)))
        ids.append(row)
    for r in range(rows - 1):
        for c in range(cols - 1):
            bm.faces.new((ids[r][c], ids[r][c + 1], ids[r + 1][c + 1], ids[r + 1][c]))
            bm.faces.new((ids[r][c + 1], ids[r][c], ids[r + 1][c], ids[r + 1][c + 1]))
    transform_creature(bm)
    return object_from_bmesh("prop_kelp", bm, material)


def make_reed(material: bpy.types.Material) -> bpy.types.Object:
    bm = bmesh.new()
    blades = (
        (0.0, 0.08, 1.0, 0.92),
        (2.15, -0.06, 0.86, 0.7),
        (-2.05, 0.05, 0.78, 0.58),
    )
    for yaw, lean, height, width in blades:
        rows = 7
        ids: list[tuple[bmesh.types.BMVert, bmesh.types.BMVert]] = []
        ca, sa = math.cos(yaw), math.sin(yaw)
        for r in range(rows):
            t = r / (rows - 1)
            y = -0.5 + height * t
            w = width + (0.03 - width) * t
            z = lean * t * t
            a = bm.verts.new((-w * ca, y, -w * sa + z))
            b = bm.verts.new((w * ca, y, w * sa + z))
            ids.append((a, b))
        for r in range(rows - 1):
            bm.faces.new((ids[r][0], ids[r][1], ids[r + 1][1], ids[r + 1][0]))
            bm.faces.new((ids[r][1], ids[r][0], ids[r + 1][0], ids[r + 1][1]))
    transform_creature(bm)
    return object_from_bmesh("prop_reed", bm, material)


def make_shell(material: bpy.types.Material) -> bpy.types.Object:
    bm = bmesh.new()
    rings, segs = 8, 12
    ids: list[list[bmesh.types.BMVert]] = []
    for i in range(rings):
        t = i / (rings - 1)
        lat = t * math.pi * 0.52
        row = []
        for s in range(segs + 1):
            u = s / segs
            lon = u * math.tau
            ridge = 1.0 + 0.08 * math.sin(lon * 9)
            rad = math.sin(lat) * ridge
            y = -0.12 + math.cos(lat) * 0.55 * (0.55 + 0.45 * math.sin(lat))
            x = math.cos(lon) * rad
            z = math.sin(lon) * rad * 0.78
            row.append(bm.verts.new((x, y, z)))
        ids.append(row)
    for i in range(rings - 1):
        for s in range(segs):
            bm.faces.new((ids[i][s], ids[i][s + 1], ids[i + 1][s + 1], ids[i + 1][s]))
    normalize_radius(bm, 1.0)
    transform_creature(bm)
    return object_from_bmesh("prop_shell", bm, material)


def make_spiral(material: bpy.types.Material) -> bpy.types.Object:
    bm = bmesh.new()
    turns, path, segs = 2.4, 20, 8
    rings: list[list[bmesh.types.BMVert]] = []
    for i in range(path):
        t = i / (path - 1)
        ang = t * turns * math.tau
        rad = 0.14 + (1.0 - 0.14) * (t ** 0.82)
        cx = math.cos(ang) * rad
        cy = math.sin(ang) * rad
        tube = (0.2 + 0.16 * math.sin(t * math.pi)) * (0.92 - t * 0.12)
        nx, ny = math.cos(ang), math.sin(ang)
        row = []
        for s in range(segs):
            a = (s / segs) * math.tau
            ca, sa = math.cos(a), math.sin(a)
            row.append(bm.verts.new((cx + nx * ca * tube * 0.42, cy + ny * ca * tube * 0.42, sa * tube)))
        rings.append(row)
    for i in range(path - 1):
        for s in range(segs):
            n = (s + 1) % segs
            bm.faces.new((rings[i][s], rings[i][n], rings[i + 1][n], rings[i + 1][s]))
    normalize_radius(bm, 1.18)
    transform_creature(bm)
    return object_from_bmesh("prop_spiral", bm, material)


def lumpy_sphere(subdiv: int, salt: float, squash_y: float, stretch_z: float) -> bmesh.types.BMesh:
    bm = icosphere_bm(subdiv, 1.0)
    for vert in bm.verts:
        x, y, z = vert.co.x, vert.co.y * squash_y, vert.co.z * stretch_z
        nse = noise3(x * 1.4, y * 1.6, z * 1.3, salt)
        clump = 1.0 + nse * 0.18 + abs(nse) * 0.08
        vert.co = Vector((x * clump, y * clump, z * clump))
    normalize_radius(bm, 1.0)
    return bm


def make_crown(material: bpy.types.Material) -> bpy.types.Object:
    bm = lumpy_sphere(2, 3.2, 0.82, 1.22)
    transform_creature(bm)
    return object_from_bmesh("prop_crown", bm, material)


def make_canopy(material: bpy.types.Material) -> bpy.types.Object:
    bm = lumpy_sphere(2, 6.8, 1.05, 0.92)
    for vert in bm.verts:
        x, y, z = vert.co.x, vert.co.y, vert.co.z
        t = min(1.0, max(0.0, y + 0.5))
        taper = 1.12 + (0.55 - 1.12) * t
        y2 = -0.5 + min(1.0, max(0.0, (y + 0.62) / 1.2))
        vert.co = Vector((x * taper, y2, z * taper))
    normalize_radius(bm, 1.0)
    transform_creature(bm)
    return object_from_bmesh("prop_canopy", bm, material)


def make_scrub(material: bpy.types.Material) -> bpy.types.Object:
    bm = lumpy_sphere(2, 9.5, 0.7, 1.05)
    for vert in bm.verts:
        if vert.co.y < -0.15:
            vert.co.y += (-0.42 - vert.co.y) * 0.65
    normalize_radius(bm, 1.0)
    transform_creature(bm)
    return object_from_bmesh("prop_scrub", bm, material)


def export_glb(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    kwargs = dict(
        filepath=str(path),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_extras=False,
        export_animations=False,
        use_selection=False,
    )
    rich = dict(
        kwargs,
        export_lights=False,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_colors=False,
        export_skins=False,
        export_morph=False,
    )
    try:
        bpy.ops.export_scene.gltf(**rich)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)


def main() -> None:
    out = parse_out()
    reset_scene()
    mats = {name: mat(f"mat_{name}", color, rough) for name, (color, rough) in MATS.items()}

    make_rock("prop_rock_dry", mats["prop_rock_dry"], salt=1.7, jagged=1.15, squash_y=0.92, stretch_x=1.08, stretch_z=0.94, flatten=0.28)
    make_rock("prop_rock_wet", mats["prop_rock_wet"], salt=8.4, jagged=0.72, squash_y=0.78, stretch_x=1.12, stretch_z=1.04, flatten=0.38)
    make_rock("prop_rock_shelf", mats["prop_rock_shelf"], salt=12.1, jagged=0.85, squash_y=0.52, stretch_x=1.22, stretch_z=0.88, flatten=0.5)
    make_shell(mats["prop_shell"])
    make_spiral(mats["prop_spiral"])
    make_kelp(mats["prop_kelp"])
    make_driftwood(mats["prop_driftwood"])
    make_trunk(mats["prop_trunk"])
    make_crown(mats["prop_crown"])
    make_canopy(mats["prop_canopy"])
    make_scrub(mats["prop_scrub"])
    make_reed(mats["prop_reed"])

    export_glb(out)
    size = out.stat().st_size if out.exists() else 0
    print(json.dumps({"out": str(out), "bytes": size, "objects": len(bpy.data.objects)}))


if __name__ == "__main__":
    main()
