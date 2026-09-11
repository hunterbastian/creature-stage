#!/usr/bin/env python3
"""Build Tideform saurian GLB kit (Blender 4.2, headless).

Creature space (matches R3F/Three): +X right, +Y up, +Z forward.
Blender space: +X right, +Y forward, +Z up. Conversion happens at mesh build.

Usage (from repo root):

    blender --background --python scripts/blender/build_saurians.py

Optional:

    /path/to/blender --background --python scripts/blender/build_saurians.py -- \\
        --out public/models/saurian-kit.glb
"""

from __future__ import annotations

import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import bpy
import bmesh
from mathutils import Euler, Vector

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "public" / "models" / "saurian-kit.glb"
SOCKETS_TS = ROOT / "src" / "lib" / "game" / "saurian-sockets.ts"

SEAFOAM = (0.431, 0.604, 0.533, 1.0)
SEAFOAM_DEEP = (0.38, 0.55, 0.49, 1.0)
SAGE = (0.49, 0.58, 0.52, 1.0)
CREAM = (0.918, 0.875, 0.792, 1.0)
SHELL = (0.933, 0.894, 0.816, 1.0)
KERATIN = (0.82, 0.72, 0.52, 1.0)
CLAW = (0.247, 0.235, 0.22, 1.0)
EYE = (0.43, 0.71, 0.60, 1.0)
PUPIL = (0.12, 0.14, 0.13, 1.0)
WET = (0.63, 0.50, 0.45, 1.0)


@dataclass
class Ring:
    """Cross-section in creature space (y up, z forward)."""

    z: float
    y: float
    rx: float
    ry: float
    cream: float = 0.0
    x: float = 0.0


@dataclass
class SocketSet:
    stance: str
    pitch: float
    hip: tuple[float, float]
    shoulder: tuple[float, float]
    jaw: tuple[float, float, float]
    eye: tuple[float, float, float]
    brow: tuple[float, float, float]
    arm: tuple[tuple[float, float, float], tuple[float, float, float]]
    tail_root: tuple[tuple[float, float, float], tuple[float, float, float]]
    accessory: tuple[float, float, float]
    tail_length: float


# ---------------------------------------------------------------------------
# Scene helpers
# ---------------------------------------------------------------------------


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
    for curve in list(bpy.data.curves):
        bpy.data.curves.remove(curve)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def collection() -> bpy.types.Collection:
    return bpy.context.scene.collection


def make_empty(name: str, parent: bpy.types.Object | None = None) -> bpy.types.Object:
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_size = 0.08
    empty.empty_display_type = "PLAIN_AXES"
    collection().objects.link(empty)
    if parent:
        empty.parent = parent
    return empty


def creature_to_blender(x: float, y: float, z: float) -> Vector:
    return Vector((x, z, y))


def set_creature_location(obj: bpy.types.Object, x: float, y: float, z: float) -> None:
    obj.location = creature_to_blender(x, y, z)


def set_creature_rotation(obj: bpy.types.Object, rx: float, ry: float, rz: float) -> None:
    # Creature Euler XYZ (pitch, yaw, roll) → Blender Euler after axis swap.
    obj.rotation_mode = "XYZ"
    obj.rotation_euler = Euler((rx, rz, -ry), "XYZ")


def mat(name: str, color: tuple[float, float, float, float], roughness: float) -> bpy.types.Material:
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
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


def ensure_mats() -> dict[str, bpy.types.Material]:
    return {
        "skin": mat("mat_skin", SEAFOAM, 0.62),
        "skin_sage": mat("mat_skin_sage", SAGE, 0.64),
        "skin_deep": mat("mat_skin_deep", SEAFOAM_DEEP, 0.6),
        "keratin": mat("mat_keratin", KERATIN, 0.48),
        "plate": mat("mat_plate", SHELL, 0.55),
        "cream": mat("mat_cream", CREAM, 0.58),
        "claw": mat("mat_claw", CLAW, 0.4),
        "wet": mat("mat_wet", WET, 0.28),
        "eye": mat("mat_eye", EYE, 0.18),
        "pupil": mat("mat_pupil", PUPIL, 0.22),
    }


def assign(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(material)


def shade_smooth(obj: bpy.types.Object) -> None:
    mesh = obj.data
    for poly in mesh.polygons:
        poly.use_smooth = True
    if hasattr(mesh, "use_auto_smooth"):
        mesh.use_auto_smooth = True
        mesh.auto_smooth_angle = math.radians(55)


def subdivide(obj: bpy.types.Object, levels: int = 1) -> None:
    if levels <= 0:
        return
    mod = obj.modifiers.new(name="subsurf", type="SUBSURF")
    mod.levels = levels
    mod.render_levels = levels
    mod.quality = 3
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)


def object_from_bmesh(name: str, bm: bmesh.types.BMesh, parent: bpy.types.Object | None, material: bpy.types.Material) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection().objects.link(obj)
    if parent:
        obj.parent = parent
    assign(obj, material)
    shade_smooth(obj)
    return obj


# ---------------------------------------------------------------------------
# Geometry builders
# ---------------------------------------------------------------------------


def loft_rings(rings: list[Ring], segs: int = 12) -> bmesh.types.BMesh:
    pts = [creature_to_blender(r.x, r.y, r.z) for r in rings]
    tangents: list[Vector] = []
    for i, _p in enumerate(pts):
        if i == 0:
            t = pts[1] - pts[0]
        elif i == len(pts) - 1:
            t = pts[i] - pts[i - 1]
        else:
            t = pts[i + 1] - pts[i - 1]
        if t.length < 1e-8:
            t = Vector((0.0, 1.0, 0.0))
        t.normalize()
        tangents.append(t)

    up_hint = Vector((0.0, 0.0, 1.0))
    binormals: list[Vector] = []
    normals: list[Vector] = []
    prev_b: Vector | None = None
    for t in tangents:
        b = up_hint.cross(t)
        if b.length < 1e-4:
            b = prev_b.copy() if prev_b is not None else Vector((1.0, 0.0, 0.0))
        b.normalize()
        n = t.cross(b)
        n.normalize()
        b = n.cross(t)
        b.normalize()
        prev_b = b
        binormals.append(b)
        normals.append(n)

    bm = bmesh.new()
    color_layer = bm.loops.layers.float_color.new("Color")
    uv_layer = bm.loops.layers.uv.new("UVMap")
    rows: list[list[bmesh.types.BMVert]] = []
    colors: list[list[tuple[float, float, float, float]]] = []

    for i, ring in enumerate(rings):
        row: list[bmesh.types.BMVert] = []
        row_col: list[tuple[float, float, float, float]] = []
        center = pts[i]
        for s in range(segs):
            ang = (s / segs) * math.tau
            # 0 = right, pi/2 = up, pi = left, 3pi/2 = belly
            offset = binormals[i] * ring.rx * math.cos(ang) + normals[i] * ring.ry * math.sin(ang)
            vert = bm.verts.new(center + offset)
            row.append(vert)
            belly = max(0.0, -math.sin(ang))
            cream = min(1.0, ring.cream + belly * 0.82)
            row_col.append(
                (
                    0.86 + cream * 0.18,
                    0.86 + cream * 0.12,
                    0.86 + cream * 0.02,
                    1.0,
                )
            )
        rows.append(row)
        colors.append(row_col)

    bm.verts.ensure_lookup_table()

    def paint(
        face: bmesh.types.BMFace,
        cols: list[tuple[float, float, float, float]],
        uvs: list[tuple[float, float]],
    ) -> None:
        for loop, col, uv in zip(face.loops, cols, uvs):
            loop[color_layer] = col
            loop[uv_layer].uv = uv

    n_rings = max(1, len(rows) - 1)
    for i in range(len(rows) - 1):
        v0 = i / n_rings
        v1 = (i + 1) / n_rings
        for s in range(segs):
            s2 = (s + 1) % segs
            u0 = s / segs
            u1 = (s + 1) / segs
            v00 = rows[i][s]
            v10 = rows[i + 1][s]
            v11 = rows[i + 1][s2]
            v01 = rows[i][s2]
            face = bm.faces.new((v00, v01, v11, v10))
            paint(
                face,
                [colors[i][s], colors[i][s2], colors[i + 1][s2], colors[i + 1][s]],
                [(u0, v0), (u1, v0), (u1, v1), (u0, v1)],
            )

    def cap(row: list[bmesh.types.BMVert], row_col: list, center: Vector, cream: float, flip: bool, v: float) -> None:
        mid = bm.verts.new(center)
        col = (
            0.86 + cream * 0.18,
            0.86 + cream * 0.12,
            0.86 + cream * 0.02,
            1.0,
        )
        for s in range(segs):
            s2 = (s + 1) % segs
            u0 = s / segs
            u1 = (s + 1) / segs
            verts = (mid, row[s2], row[s]) if flip else (mid, row[s], row[s2])
            face = bm.faces.new(verts)
            if flip:
                paint(face, [col, row_col[s2], row_col[s]], [(0.5, v), (u1, v), (u0, v)])
            else:
                paint(face, [col, row_col[s], row_col[s2]], [(0.5, v), (u0, v), (u1, v)])

    cap(rows[0], colors[0], pts[0], rings[0].cream, True, 0.0)
    cap(rows[-1], colors[-1], pts[-1], rings[-1].cream, False, 1.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def make_loft(
    name: str,
    rings: list[Ring],
    parent: bpy.types.Object | None,
    material: bpy.types.Material,
    segs: int = 12,
    levels: int = 1,
) -> bpy.types.Object:
    obj = object_from_bmesh(name, loft_rings(rings, segs=segs), parent, material)
    subdivide(obj, levels)
    shade_smooth(obj)
    return obj


def make_horn(
    name: str,
    parent: bpy.types.Object,
    material: bpy.types.Material,
    length: float = 0.14,
    radius: float = 0.028,
) -> bpy.types.Object:
    rings = [
        Ring(z=0.0, y=0.0, rx=radius, ry=radius * 0.9),
        Ring(z=0.01, y=length * 0.35, rx=radius * 0.78, ry=radius * 0.7),
        Ring(z=0.02, y=length * 0.72, rx=radius * 0.38, ry=radius * 0.34),
        Ring(z=0.015, y=length, rx=0.004, ry=0.004, cream=0.4),
    ]
    return make_loft(name, rings, parent, material, segs=8, levels=1)


def make_spiral_shell(
    name: str,
    parent: bpy.types.Object,
    material: bpy.types.Material,
    turns: float = 2.35,
    path_segs: int = 28,
    radial: int = 6,
) -> bpy.types.Object:
    path: list[Vector] = []
    radii: list[float] = []
    for i in range(path_segs + 1):
        u = i / path_segs
        theta = 0.55 + u * turns * math.tau
        grow = math.exp(0.2 * theta)
        radius = 0.009 * grow
        tube = 0.005 + 0.026 * u
        # Spiral in creature XZ, slightly lifted in Y — sits on a back like a barnacle.
        x = radius * math.cos(theta)
        z = radius * math.sin(theta)
        y = 0.012 * u
        path.append(creature_to_blender(x, y, z))
        radii.append(tube)

    bm = tube_along(path, radii, radial)
    obj = object_from_bmesh(name, bm, parent, material)
    shade_smooth(obj)
    return obj


def tube_along(path: list[Vector], radii: list[float], radial: int) -> bmesh.types.BMesh:
    tangents: list[Vector] = []
    for i, _p in enumerate(path):
        if i == 0:
            t = path[1] - path[0]
        elif i == len(path) - 1:
            t = path[i] - path[i - 1]
        else:
            t = path[i + 1] - path[i - 1]
        if t.length < 1e-8:
            t = Vector((0.0, 1.0, 0.0))
        t.normalize()
        tangents.append(t)

    up_hint = Vector((0.0, 0.0, 1.0))
    frames: list[tuple[Vector, Vector]] = []
    prev_b: Vector | None = None
    for t in tangents:
        b = up_hint.cross(t)
        if b.length < 1e-4:
            b = prev_b.copy() if prev_b is not None else Vector((1.0, 0.0, 0.0))
        b.normalize()
        n = t.cross(b)
        n.normalize()
        b = n.cross(t)
        b.normalize()
        prev_b = b
        frames.append((n, b))

    bm = bmesh.new()
    rows: list[list[bmesh.types.BMVert]] = []
    for i, center in enumerate(path):
        n, b = frames[i]
        row = []
        for s in range(radial):
            ang = (s / radial) * math.tau
            offset = (b * math.cos(ang) + n * math.sin(ang)) * radii[i]
            row.append(bm.verts.new(center + offset))
        rows.append(row)
    for i in range(len(rows) - 1):
        for s in range(radial):
            s2 = (s + 1) % radial
            bm.faces.new((rows[i][s], rows[i][s2], rows[i + 1][s2], rows[i + 1][s]))
    bm.faces.new(list(reversed(rows[0])))
    bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def make_osteoderm(
    name: str,
    parent: bpy.types.Object,
    material: bpy.types.Material,
    rx: float = 0.045,
    ry: float = 0.028,
    rz: float = 0.038,
) -> bpy.types.Object:
    rings = [
        Ring(z=-rz, y=0.0, rx=rx * 0.4, ry=ry * 0.35, cream=0.5),
        Ring(z=0.0, y=ry * 0.15, rx=rx, ry=ry, cream=0.4),
        Ring(z=rz, y=0.0, rx=rx * 0.4, ry=ry * 0.35, cream=0.5),
    ]
    return make_loft(name, rings, parent, material, segs=8, levels=0)


def make_kite_plate(
    name: str,
    parent: bpy.types.Object,
    material: bpy.types.Material,
    height: float = 0.55,
    width: float = 0.28,
    thick: float = 0.04,
) -> bpy.types.Object:
    bm = bmesh.new()
    # Creature: thin in X, tall in Y, diamond in YZ.
    hw = width * 0.5
    ht = thick * 0.5
    verts_c = [
        (0.0, 0.0, 0.0),
        (0.0, height, 0.02),
        (hw, height * 0.46, 0.04),
        (-hw, height * 0.46, 0.04),
        (0.0, height * 0.42, -0.08),
        (ht, height * 0.48, 0.01),
        (-ht, height * 0.48, 0.01),
    ]
    vs = [bm.verts.new(creature_to_blender(*p)) for p in verts_c]
    faces = [
        (0, 2, 1),
        (0, 1, 3),
        (0, 4, 2),
        (0, 3, 4),
        (2, 5, 1),
        (3, 1, 6),
        (4, 1, 5),
        (4, 6, 1),
        (2, 4, 5),
        (3, 6, 4),
    ]
    for a, b, c in faces:
        try:
            bm.faces.new((vs[a], vs[b], vs[c]))
        except ValueError:
            pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    obj = object_from_bmesh(name, bm, parent, material)
    shade_smooth(obj)
    return obj


def make_toe(
    name: str,
    parent: bpy.types.Object,
    material: bpy.types.Material,
    length: float = 0.12,
) -> bpy.types.Object:
    rings = [
        Ring(z=0.0, y=0.0, rx=0.018, ry=0.016),
        Ring(z=length * 0.45, y=-0.008, rx=0.014, ry=0.012),
        Ring(z=length * 0.85, y=-0.012, rx=0.008, ry=0.007, cream=0.2),
        Ring(z=length, y=-0.01, rx=0.003, ry=0.003, cream=0.3),
    ]
    return make_loft(name, rings, parent, material, segs=6, levels=0)


# ---------------------------------------------------------------------------
# Chassis
# ---------------------------------------------------------------------------


def place_shell(
    parent: bpy.types.Object,
    mats: dict[str, bpy.types.Material],
    name: str,
    x: float,
    y: float,
    z: float,
    scale: float,
    rot: tuple[float, float, float],
) -> None:
    shell = make_spiral_shell(name, parent, mats["plate"])
    set_creature_location(shell, x, y, z)
    set_creature_rotation(shell, *rot)
    shell.scale = (scale, scale, scale)


def place_socket(parent: bpy.types.Object, name: str, x: float, y: float, z: float) -> bpy.types.Object:
    empty = make_empty(name, parent)
    set_creature_location(empty, x, y, z)
    return empty


def build_theropod(mats: dict[str, bpy.types.Material]) -> SocketSet:
    root = make_empty("chassis_sleek")
    rings = [
        Ring(z=-0.58, y=0.10, rx=0.07, ry=0.07),
        Ring(z=-0.38, y=0.14, rx=0.16, ry=0.18),
        Ring(z=-0.16, y=0.13, rx=0.24, ry=0.28),
        Ring(z=0.04, y=0.14, rx=0.22, ry=0.27),
        Ring(z=0.26, y=0.18, rx=0.24, ry=0.32),
        Ring(z=0.48, y=0.24, rx=0.28, ry=0.38),
        Ring(z=0.68, y=0.30, rx=0.22, ry=0.30),
        Ring(z=0.86, y=0.38, rx=0.13, ry=0.16),
        Ring(z=1.02, y=0.46, rx=0.12, ry=0.13),
        Ring(z=1.16, y=0.50, rx=0.17, ry=0.15, cream=0.25),
        Ring(z=1.30, y=0.47, rx=0.19, ry=0.14, cream=0.55),
        Ring(z=1.44, y=0.43, rx=0.12, ry=0.10, cream=0.85),
        Ring(z=1.58, y=0.39, rx=0.06, ry=0.055, cream=1.0),
    ]
    make_loft("sleek_body", rings, root, mats["skin"], segs=12, levels=1)

    for side, sx in (("L", 1.0), ("R", -1.0)):
        horn = make_horn(f"sleek_horn_{side}", root, mats["keratin"], length=0.13, radius=0.026)
        set_creature_location(horn, 0.09 * sx, 0.58, 1.18)
        set_creature_rotation(horn, 0.35, 0.18 * sx, -0.55 * sx)

    # Shoulder / nape spiral shells — locked coastal vibe.
    shells = [
        (0.0, 0.58, 0.86, 1.05, (-0.55, 0.0, 0.0)),
        (0.12, 0.52, 0.68, 1.15, (-0.4, 0.55, 0.1)),
        (-0.12, 0.52, 0.68, 1.15, (-0.4, -0.55, -0.1)),
        (0.14, 0.50, 0.48, 1.28, (-0.32, 0.7, 0.12)),
        (-0.14, 0.50, 0.48, 1.28, (-0.32, -0.7, -0.12)),
        (0.10, 0.46, 0.28, 0.95, (-0.22, 0.5, 0.08)),
        (-0.10, 0.46, 0.28, 0.95, (-0.22, -0.5, -0.08)),
        (0.0, 0.44, 0.10, 0.78, (-0.16, 0.0, 0.0)),
    ]
    for i, (x, y, z, sc, rot) in enumerate(shells):
        place_shell(root, mats, f"sleek_shell_{i}", x, y, z, sc, rot)

    for i, z in enumerate((0.58, 0.38, 0.18, -0.02, -0.22)):
        nub = make_osteoderm(f"sleek_ost_{i}", root, mats["plate"], rx=0.04, ry=0.026, rz=0.034)
        set_creature_location(nub, 0.0, 0.42 - i * 0.02, z)

    # Face rings live on the chassis so the locked eye-ring read stays even with bead eyes.
    for side, sx in (("L", 1.0), ("R", -1.0)):
        ring = make_loft(
            f"sleek_eyerim_{side}",
            [
                Ring(z=-0.01, y=0.0, rx=0.055, ry=0.055, cream=0.8),
                Ring(z=0.0, y=0.0, rx=0.062, ry=0.06, cream=0.85),
                Ring(z=0.012, y=0.0, rx=0.05, ry=0.05, cream=0.8),
            ],
            root,
            mats["plate"],
            segs=10,
            levels=0,
        )
        set_creature_location(ring, 0.175 * sx, 0.50, 1.26)

    place_socket(root, "socket_sleek_eye_L", 0.175, 0.50, 1.27)
    place_socket(root, "socket_sleek_eye_R", -0.175, 0.50, 1.27)
    place_socket(root, "socket_sleek_jaw", 0.0, 0.34, 1.50)
    place_socket(root, "socket_sleek_arm_L", 0.26, 0.18, 0.58)
    place_socket(root, "socket_sleek_arm_R", -0.26, 0.18, 0.58)
    place_socket(root, "socket_sleek_tail", 0.0, 0.12, -0.52)
    place_socket(root, "socket_sleek_hip_L", 0.19, 0.0, -0.08)
    place_socket(root, "socket_sleek_hip_R", -0.19, 0.0, -0.08)
    place_socket(root, "socket_sleek_brow_L", 0.10, 0.60, 1.16)
    place_socket(root, "socket_sleek_brow_R", -0.10, 0.60, 1.16)
    place_socket(root, "socket_sleek_acc", 0.0, 0.52, 0.22)

    return SocketSet(
        stance="biped",
        pitch=-0.04,
        hip=(0.19, -0.08),
        shoulder=(0.26, 0.58),
        jaw=(0.0, 0.34, 1.50),
        eye=(0.175, 0.50, 1.27),
        brow=(0.10, 0.60, 1.16),
        arm=((0.26, 0.18, 0.58), (0.85, 0.0, 0.85)),
        tail_root=((0.0, 0.12, -0.52), (-0.16, 0.0, 0.0)),
        accessory=(0.0, 0.52, 0.22),
        tail_length=1.42,
    )


def build_sauropod(mats: dict[str, bpy.types.Material]) -> SocketSet:
    root = make_empty("chassis_plump")
    rings = [
        Ring(z=-0.82, y=0.14, rx=0.14, ry=0.14),
        Ring(z=-0.52, y=0.18, rx=0.38, ry=0.36),
        Ring(z=-0.18, y=0.16, rx=0.46, ry=0.42),
        Ring(z=0.16, y=0.16, rx=0.48, ry=0.44),
        Ring(z=0.50, y=0.20, rx=0.38, ry=0.36),
        Ring(z=0.78, y=0.26, rx=0.22, ry=0.22),
        Ring(z=1.05, y=0.34, rx=0.14, ry=0.14),
        Ring(z=1.36, y=0.42, rx=0.11, ry=0.11),
        Ring(z=1.68, y=0.50, rx=0.10, ry=0.10),
        Ring(z=2.00, y=0.55, rx=0.09, ry=0.09),
        Ring(z=2.28, y=0.58, rx=0.10, ry=0.09, cream=0.2),
        Ring(z=2.48, y=0.56, rx=0.13, ry=0.11, cream=0.55),
        Ring(z=2.64, y=0.52, rx=0.09, ry=0.07, cream=0.9),
        Ring(z=2.76, y=0.49, rx=0.045, ry=0.038, cream=1.0),
    ]
    make_loft("plump_body", rings, root, mats["skin_deep"], segs=12, levels=1)

    nape = [
        (0.0, 0.48, 0.92, 0.85, (-0.45, 0.0, 0.0)),
        (0.0, 0.54, 1.22, 0.7, (-0.35, 0.0, 0.0)),
        (0.0, 0.60, 1.52, 0.58, (-0.26, 0.0, 0.0)),
        (0.0, 0.64, 1.82, 0.48, (-0.18, 0.0, 0.0)),
        (0.0, 0.56, 0.42, 1.15, (-0.3, 0.0, 0.0)),
        (0.16, 0.50, 0.22, 0.9, (-0.22, 0.55, 0.1)),
        (-0.16, 0.50, 0.22, 0.9, (-0.22, -0.55, -0.1)),
        (0.0, 0.52, 0.02, 1.0, (-0.16, 0.0, 0.0)),
        (0.0, 0.46, -0.22, 0.78, (-0.1, 0.0, 0.0)),
    ]
    for i, (x, y, z, sc, rot) in enumerate(nape):
        place_shell(root, mats, f"plump_shell_{i}", x, y, z, sc, rot)

    for i, z in enumerate((0.28, 0.06, -0.16)):
        nub = make_osteoderm(f"plump_ost_{i}", root, mats["plate"], rx=0.055, ry=0.032, rz=0.04)
        set_creature_location(nub, 0.0, 0.48 - i * 0.03, z)

    place_socket(root, "socket_plump_eye_L", 0.12, 0.62, 2.52)
    place_socket(root, "socket_plump_eye_R", -0.12, 0.62, 2.52)
    place_socket(root, "socket_plump_jaw", 0.0, 0.48, 2.72)
    place_socket(root, "socket_plump_arm_L", 0.44, 0.18, 0.50)
    place_socket(root, "socket_plump_arm_R", -0.44, 0.18, 0.50)
    place_socket(root, "socket_plump_tail", 0.0, 0.16, -0.72)
    place_socket(root, "socket_plump_hip_L", 0.32, 0.0, -0.42)
    place_socket(root, "socket_plump_hip_R", -0.32, 0.0, -0.42)
    place_socket(root, "socket_plump_brow_L", 0.08, 0.68, 2.40)
    place_socket(root, "socket_plump_brow_R", -0.08, 0.68, 2.40)
    place_socket(root, "socket_plump_acc", 0.0, 0.54, 0.18)
    place_socket(root, "socket_plump_sh_L", 0.30, 0.0, 0.52)
    place_socket(root, "socket_plump_sh_R", -0.30, 0.0, 0.52)

    return SocketSet(
        stance="quad",
        pitch=0.02,
        hip=(0.32, -0.42),
        shoulder=(0.30, 0.52),
        jaw=(0.0, 0.48, 2.72),
        eye=(0.12, 0.62, 2.52),
        brow=(0.08, 0.68, 2.40),
        arm=((0.44, 0.18, 0.50), (0.12, 0.0, 0.32)),
        tail_root=((0.0, 0.16, -0.72), (-0.22, 0.0, 0.0)),
        accessory=(0.0, 0.54, 0.18),
        tail_length=1.6,
    )


def build_stego(mats: dict[str, bpy.types.Material]) -> SocketSet:
    root = make_empty("chassis_spiky")
    rings = [
        Ring(z=-0.88, y=0.14, rx=0.12, ry=0.12),
        Ring(z=-0.58, y=0.22, rx=0.32, ry=0.30),
        Ring(z=-0.22, y=0.30, rx=0.40, ry=0.40),
        Ring(z=0.12, y=0.28, rx=0.38, ry=0.38),
        Ring(z=0.44, y=0.20, rx=0.32, ry=0.30),
        Ring(z=0.72, y=0.16, rx=0.22, ry=0.20),
        Ring(z=0.98, y=0.18, rx=0.14, ry=0.13),
        Ring(z=1.22, y=0.22, rx=0.11, ry=0.10),
        Ring(z=1.44, y=0.26, rx=0.10, ry=0.09, cream=0.15),
        Ring(z=1.62, y=0.24, rx=0.08, ry=0.07, cream=0.35),
        Ring(z=1.78, y=0.21, rx=0.05, ry=0.04, cream=0.55),
    ]
    make_loft("spiky_body", rings, root, mats["skin_sage"], segs=12, levels=1)

    plates = [
        (-0.045, 0.42, 0.58, 0.38, 0.18, 0.08),
        (0.05, 0.52, 0.34, 0.58, 0.24, 0.04),
        (-0.05, 0.64, 0.10, 0.78, 0.28, 0.0),
        (0.055, 0.74, -0.12, 0.92, 0.32, -0.04),
        (-0.04, 0.70, -0.34, 0.84, 0.28, -0.08),
        (0.04, 0.56, -0.54, 0.62, 0.22, -0.14),
        (-0.03, 0.40, -0.72, 0.42, 0.16, -0.2),
        (0.02, 0.28, -0.88, 0.28, 0.12, -0.26),
    ]
    for i, (x, y, z, h, w, pitch) in enumerate(plates):
        plate = make_kite_plate(f"spiky_plate_{i}", root, mats["plate"], height=h, width=w, thick=0.042)
        set_creature_location(plate, x, y, z)
        set_creature_rotation(plate, pitch, 0.0, 0.0)
        if i in (1, 3, 5):
            place_shell(root, mats, f"spiky_plateshell_{i}", x + 0.03, y + h * 0.42, z, 0.55, (0.0, 1.2, 0.0))

    flanks = [
        (0.30, 0.36, 0.22, 1.2, (-0.15, 1.05, 0.12)),
        (-0.30, 0.36, 0.22, 1.2, (-0.15, -1.05, -0.12)),
        (0.26, 0.34, 0.0, 0.95, (-0.08, 1.0, 0.08)),
        (-0.26, 0.34, 0.0, 0.95, (-0.08, -1.0, -0.08)),
        (0.22, 0.30, -0.22, 0.78, (-0.05, 0.95, 0.06)),
        (-0.22, 0.30, -0.22, 0.78, (-0.05, -0.95, -0.06)),
    ]
    for i, (x, y, z, sc, rot) in enumerate(flanks):
        place_shell(root, mats, f"spiky_flank_{i}", x, y, z, sc, rot)

    place_socket(root, "socket_spiky_eye_L", 0.10, 0.30, 1.56)
    place_socket(root, "socket_spiky_eye_R", -0.10, 0.30, 1.56)
    place_socket(root, "socket_spiky_jaw", 0.0, 0.18, 1.80)
    place_socket(root, "socket_spiky_arm_L", 0.40, 0.14, 0.42)
    place_socket(root, "socket_spiky_arm_R", -0.40, 0.14, 0.42)
    place_socket(root, "socket_spiky_tail", 0.0, 0.16, -0.78)
    place_socket(root, "socket_spiky_hip_L", 0.34, 0.0, -0.42)
    place_socket(root, "socket_spiky_hip_R", -0.34, 0.0, -0.42)
    place_socket(root, "socket_spiky_brow_L", 0.07, 0.36, 1.42)
    place_socket(root, "socket_spiky_brow_R", -0.07, 0.36, 1.42)
    place_socket(root, "socket_spiky_acc", 0.0, 0.48, 0.10)
    place_socket(root, "socket_spiky_sh_L", 0.30, 0.0, 0.48)
    place_socket(root, "socket_spiky_sh_R", -0.30, 0.0, 0.48)

    return SocketSet(
        stance="quad",
        pitch=0.03,
        hip=(0.34, -0.42),
        shoulder=(0.30, 0.48),
        jaw=(0.0, 0.18, 1.80),
        eye=(0.10, 0.30, 1.56),
        brow=(0.07, 0.36, 1.42),
        arm=((0.40, 0.14, 0.42), (0.08, 0.0, 0.22)),
        tail_root=((0.0, 0.16, -0.78), (-0.12, 0.0, 0.0)),
        accessory=(0.0, 0.48, 0.10),
        tail_length=1.5,
    )


# ---------------------------------------------------------------------------
# Modular parts (origin at attach point)
# ---------------------------------------------------------------------------


def build_leg(
    name: str,
    mats: dict[str, bpy.types.Material],
    kind: str,
) -> float:
    root = make_empty(name)
    if kind == "stilts":
        rings = [
            Ring(z=0.02, y=0.02, rx=0.11, ry=0.12),
            Ring(z=0.06, y=-0.16, rx=0.13, ry=0.14),
            Ring(z=0.08, y=-0.34, rx=0.10, ry=0.11),
            Ring(z=0.05, y=-0.42, rx=0.08, ry=0.09),
            Ring(z=0.02, y=-0.62, rx=0.07, ry=0.07, cream=0.15),
            Ring(z=0.06, y=-0.80, rx=0.055, ry=0.05, cream=0.35),
            Ring(z=0.14, y=-0.90, rx=0.09, ry=0.04, cream=0.55),
            Ring(z=0.20, y=-0.92, rx=0.07, ry=0.03, cream=0.6),
        ]
        drop = 0.94
        toe_y, toe_z = -0.92, 0.18
        toe_len = 0.13
    elif kind == "stubby":
        rings = [
            Ring(z=0.0, y=0.02, rx=0.12, ry=0.12),
            Ring(z=0.02, y=-0.16, rx=0.13, ry=0.13),
            Ring(z=0.03, y=-0.32, rx=0.11, ry=0.11),
            Ring(z=0.06, y=-0.48, rx=0.12, ry=0.06, cream=0.45),
            Ring(z=0.14, y=-0.52, rx=0.11, ry=0.045, cream=0.55),
        ]
        drop = 0.56
        toe_y, toe_z = -0.53, 0.14
        toe_len = 0.1
    else:
        rings = [
            Ring(z=0.0, y=0.02, rx=0.13, ry=0.12),
            Ring(z=0.02, y=-0.16, rx=0.14, ry=0.13),
            Ring(z=0.04, y=-0.34, rx=0.13, ry=0.1),
            Ring(z=0.08, y=-0.48, rx=0.16, ry=0.055, cream=0.4),
            Ring(z=0.18, y=-0.50, rx=0.14, ry=0.04, cream=0.5),
        ]
        drop = 0.54
        toe_y, toe_z = -0.50, 0.18
        toe_len = 0.09

    make_loft(f"{name}_limb", rings, root, mats["skin"], segs=10, levels=1)
    for i, ox in enumerate((-0.045, 0.0, 0.045)):
        toe = make_toe(f"{name}_toe_{i}", root, mats["claw"], length=toe_len)
        set_creature_location(toe, ox, toe_y, toe_z)
        if kind == "stilts" and i == 1:
            set_creature_rotation(toe, 0.08, 0.0, 0.0)
    if kind == "stilts":
        dew = make_toe(f"{name}_dew", root, mats["claw"], length=0.07)
        set_creature_location(dew, 0.03, -0.78, -0.02)
        set_creature_rotation(dew, 2.4, 0.0, 0.0)
    return drop


def build_mouth(name: str, mats: dict[str, bpy.types.Material], kind: str) -> None:
    root = make_empty(name)
    if kind == "maw":
        make_loft(
            f"{name}_upper",
            [
                Ring(z=0.0, y=0.02, rx=0.09, ry=0.04, cream=0.7),
                Ring(z=0.08, y=0.01, rx=0.08, ry=0.035, cream=0.8),
                Ring(z=0.16, y=-0.01, rx=0.05, ry=0.022, cream=0.9),
            ],
            root,
            mats["cream"],
            segs=10,
            levels=1,
        )
        make_loft(
            f"{name}_lower",
            [
                Ring(z=0.0, y=-0.03, rx=0.08, ry=0.03, cream=0.6),
                Ring(z=0.1, y=-0.04, rx=0.06, ry=0.022, cream=0.7),
                Ring(z=0.16, y=-0.03, rx=0.03, ry=0.014, cream=0.8),
            ],
            root,
            mats["cream"],
            segs=8,
            levels=0,
        )
        for i, (x, z) in enumerate(((-0.04, 0.07), (0.0, 0.1), (0.04, 0.07), (-0.025, 0.13), (0.025, 0.13))):
            tooth = make_loft(
                f"{name}_tooth_{i}",
                [
                    Ring(z=0.0, y=0.0, rx=0.008, ry=0.01),
                    Ring(z=0.0, y=-0.028, rx=0.004, ry=0.004),
                    Ring(z=0.0, y=-0.04, rx=0.002, ry=0.002, cream=0.2),
                ],
                root,
                mats["keratin"],
                segs=5,
                levels=0,
            )
            set_creature_location(tooth, x, -0.01, z)
    elif kind == "beak":
        make_loft(
            f"{name}_sheath",
            [
                Ring(z=0.0, y=0.01, rx=0.055, ry=0.03, cream=0.4),
                Ring(z=0.07, y=0.0, rx=0.04, ry=0.022, cream=0.3),
                Ring(z=0.14, y=-0.02, rx=0.018, ry=0.012, cream=0.2),
                Ring(z=0.18, y=-0.04, rx=0.006, ry=0.006, cream=0.2),
            ],
            root,
            mats["keratin"],
            segs=8,
            levels=1,
        )
        make_loft(
            f"{name}_lower",
            [
                Ring(z=0.02, y=-0.02, rx=0.04, ry=0.016, cream=0.3),
                Ring(z=0.1, y=-0.03, rx=0.02, ry=0.01, cream=0.2),
                Ring(z=0.15, y=-0.035, rx=0.008, ry=0.006, cream=0.2),
            ],
            root,
            mats["keratin"],
            segs=6,
            levels=0,
        )
    else:
        make_loft(
            f"{name}_pad",
            [
                Ring(z=0.0, y=0.0, rx=0.07, ry=0.07, cream=0.2),
                Ring(z=0.04, y=0.0, rx=0.09, ry=0.09),
                Ring(z=0.07, y=0.0, rx=0.06, ry=0.06),
                Ring(z=0.08, y=0.0, rx=0.03, ry=0.03),
            ],
            root,
            mats["wet"],
            segs=10,
            levels=1,
        )


def build_eyes(name: str, mats: dict[str, bpy.types.Material], kind: str) -> None:
    root = make_empty(name)
    if kind == "beads":
        make_loft(
            f"{name}_globe",
            [
                Ring(z=-0.02, y=0.0, rx=0.042, ry=0.042),
                Ring(z=0.0, y=0.0, rx=0.05, ry=0.05),
                Ring(z=0.03, y=0.0, rx=0.04, ry=0.04),
                Ring(z=0.048, y=0.0, rx=0.016, ry=0.016),
            ],
            root,
            mats["eye"],
            segs=10,
            levels=1,
        )
        pupil = make_loft(
            f"{name}_pupil",
            [
                Ring(z=0.03, y=0.0, rx=0.022, ry=0.022),
                Ring(z=0.042, y=0.0, rx=0.018, ry=0.018),
                Ring(z=0.05, y=0.0, rx=0.01, ry=0.01),
            ],
            root,
            mats["pupil"],
            segs=8,
            levels=0,
        )
        set_creature_location(pupil, 0.0, 0.0, 0.0)
    elif kind == "stalks":
        make_loft(
            f"{name}_stalk",
            [
                Ring(z=0.0, y=0.0, rx=0.028, ry=0.028),
                Ring(z=0.02, y=0.12, rx=0.024, ry=0.024),
                Ring(z=0.03, y=0.22, rx=0.026, ry=0.026),
            ],
            root,
            mats["skin"],
            segs=8,
            levels=1,
        )
        globe = make_loft(
            f"{name}_globe",
            [
                Ring(z=-0.02, y=0.0, rx=0.06, ry=0.06),
                Ring(z=0.0, y=0.0, rx=0.08, ry=0.08),
                Ring(z=0.04, y=0.0, rx=0.05, ry=0.05),
            ],
            root,
            mats["eye"],
            segs=10,
            levels=1,
        )
        set_creature_location(globe, 0.0, 0.28, 0.04)
        pupil = make_loft(
            f"{name}_pupil",
            [
                Ring(z=0.0, y=0.0, rx=0.03, ry=0.03),
                Ring(z=0.02, y=0.0, rx=0.022, ry=0.022),
            ],
            root,
            mats["pupil"],
            segs=8,
            levels=0,
        )
        set_creature_location(pupil, 0.0, 0.28, 0.08)
    else:
        make_loft(
            f"{name}_globe",
            [
                Ring(z=-0.02, y=0.0, rx=0.08, ry=0.07),
                Ring(z=0.0, y=0.0, rx=0.1, ry=0.085),
                Ring(z=0.04, y=0.0, rx=0.07, ry=0.06),
            ],
            root,
            mats["eye"],
            segs=10,
            levels=1,
        )
        pupil = make_loft(
            f"{name}_pupil",
            [
                Ring(z=0.03, y=0.0, rx=0.04, ry=0.04),
                Ring(z=0.05, y=0.0, rx=0.028, ry=0.028),
            ],
            root,
            mats["pupil"],
            segs=8,
            levels=0,
        )
        set_creature_location(pupil, 0.0, 0.0, 0.02)


def build_arms(name: str, mats: dict[str, bpy.types.Material], kind: str) -> None:
    root = make_empty(name)
    if kind == "none":
        make_loft(
            f"{name}_nub",
            [
                Ring(z=0.0, y=0.0, rx=0.04, ry=0.04),
                Ring(z=0.02, y=-0.1, rx=0.038, ry=0.038),
                Ring(z=0.03, y=-0.2, rx=0.042, ry=0.04, cream=0.4),
            ],
            root,
            mats["cream"],
            segs=8,
            levels=1,
        )
    elif kind == "grabbers":
        make_loft(
            f"{name}_arm",
            [
                Ring(z=0.0, y=0.0, rx=0.05, ry=0.05),
                Ring(z=0.02, y=-0.12, rx=0.045, ry=0.045),
                Ring(z=0.03, y=-0.24, rx=0.04, ry=0.04),
                Ring(z=0.04, y=-0.32, rx=0.055, ry=0.04, cream=0.4),
            ],
            root,
            mats["skin"],
            segs=8,
            levels=1,
        )
        for i, ox in enumerate((-0.025, 0.025)):
            claw = make_toe(f"{name}_claw_{i}", root, mats["claw"], length=0.07)
            set_creature_location(claw, ox, -0.36, 0.03)
    else:
        make_loft(
            f"{name}_fin",
            [
                Ring(z=-0.04, y=0.0, rx=0.02, ry=0.08),
                Ring(z=0.0, y=0.0, rx=0.03, ry=0.14),
                Ring(z=0.08, y=0.0, rx=0.025, ry=0.12),
                Ring(z=0.16, y=0.0, rx=0.012, ry=0.06),
            ],
            root,
            mats["skin"],
            segs=8,
            levels=1,
        )


def build_tail(name: str, mats: dict[str, bpy.types.Material], kind: str, length: float) -> None:
    root = make_empty(name)
    extra = 0.22 if kind == "whip" else 0.0
    total = length + extra
    rings = [
        Ring(z=0.0, y=0.0, rx=0.12, ry=0.12),
        Ring(z=-total * 0.22, y=-0.02, rx=0.1, ry=0.1),
        Ring(z=-total * 0.45, y=-0.04, rx=0.075, ry=0.075),
        Ring(z=-total * 0.7, y=-0.07, rx=0.05, ry=0.05),
        Ring(z=-total * 0.92, y=-0.1, rx=0.028, ry=0.028),
        Ring(z=-total, y=-0.12, rx=0.012, ry=0.012),
    ]
    make_loft(f"{name}_body", rings, root, mats["skin"], segs=10, levels=1)

    if kind != "fan":
        for i, t in enumerate((0.18, 0.36, 0.54, 0.72, 0.86)):
            nub = make_osteoderm(f"{name}_ost_{i}", root, mats["plate"], rx=0.032 * (1 - t * 0.3), ry=0.022, rz=0.028)
            set_creature_location(nub, 0.0, 0.06 - t * 0.08, -total * t)

    if kind == "club":
        club = make_loft(
            f"{name}_club",
            [
                Ring(z=-0.04, y=0.0, rx=0.08, ry=0.08, cream=0.3),
                Ring(z=0.0, y=0.0, rx=0.15, ry=0.14, cream=0.4),
                Ring(z=0.08, y=0.0, rx=0.1, ry=0.1, cream=0.4),
            ],
            root,
            mats["plate"],
            segs=10,
            levels=1,
        )
        set_creature_location(club, 0.0, -0.12, -total)
    elif kind == "fan":
        for i, x in enumerate((-0.16, -0.08, 0.0, 0.08, 0.16)):
            vane = make_kite_plate(f"{name}_vane_{i}", root, mats["plate"], height=0.22, width=0.08, thick=0.02)
            set_creature_location(vane, x, 0.02, -total * 0.9)
            set_creature_rotation(vane, 1.15, 0.0, x * 0.8)
    elif kind == "none":
        # thagomizer-ish nubs already along stock tail
        pass


def build_accessory(name: str, mats: dict[str, bpy.types.Material], kind: str) -> None:
    root = make_empty(name)
    if kind == "spikes":
        for i, x in enumerate((-0.12, 0.0, 0.12)):
            place_shell(root, mats, f"{name}_shell_{i}", x, 0.04, 0.08 - i * 0.06, 0.9, (-0.4, 0.0, 0.0))
    elif kind == "frill":
        make_loft(
            f"{name}_collar",
            [
                Ring(z=-0.02, y=0.0, rx=0.22, ry=0.16, cream=0.4),
                Ring(z=0.0, y=0.04, rx=0.32, ry=0.22, cream=0.5),
                Ring(z=0.04, y=0.08, rx=0.28, ry=0.2, cream=0.5),
            ],
            root,
            mats["plate"],
            segs=12,
            levels=1,
        )
        for i, x in enumerate((-0.16, 0.0, 0.16)):
            place_shell(root, mats, f"{name}_shell_{i}", x, 0.14, -0.04, 0.65, (-0.3, 0.0, 0.0))
    else:
        for side, sx in (("L", 1.0), ("R", -1.0)):
            stalk = make_loft(
                f"{name}_stalk_{side}",
                [
                    Ring(z=0.0, y=0.0, rx=0.014, ry=0.014, cream=0.4),
                    Ring(z=0.01, y=0.14, rx=0.012, ry=0.012, cream=0.4),
                    Ring(z=0.02, y=0.24, rx=0.012, ry=0.012, cream=0.4),
                ],
                root,
                mats["plate"],
                segs=6,
                levels=0,
            )
            set_creature_location(stalk, 0.06 * sx, 0.0, 0.0)
            set_creature_rotation(stalk, 0.1, 0.0, 0.22 * sx)
            place_shell(root, mats, f"{name}_tip_{side}", 0.08 * sx, 0.26, 0.02, 0.5, (0.0, 0.0, 0.0))


# ---------------------------------------------------------------------------
# Export + sockets TS
# ---------------------------------------------------------------------------


def bake_mesh_rot_scale() -> None:
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        rot_scale = obj.matrix_basis.to_3x3().to_4x4()
        obj.data.transform(rot_scale)
        obj.rotation_euler = Euler((0.0, 0.0, 0.0), "XYZ")
        obj.scale = (1.0, 1.0, 1.0)
        obj.data.update()


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
    # Blender 4.2 glTF operator has drifted param names; try the rich set then fall back.
    rich = dict(
        kwargs,
        export_lights=False,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_colors=True,
        export_attributes=True,
        export_skins=False,
        export_morph=False,
        export_nla_strips=False,
        export_def_bones=False,
        export_unused_images=False,
    )
    try:
        bpy.ops.export_scene.gltf(**rich)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)


def fmt_vec3(v: tuple[float, float, float]) -> str:
    return f"[{v[0]:.3f}, {v[1]:.3f}, {v[2]:.3f}]"


def write_sockets_ts(path: Path, sockets: dict[str, SocketSet], drops: dict[str, float]) -> None:
    bodies = []
    for key, s in sockets.items():
        bodies.append(
            f"""  {key}: {{
    stance: "{s.stance}",
    pitch: {s.pitch:.3f},
    hip: {{ x: {s.hip[0]:.3f}, z: {s.hip[1]:.3f} }},
    shoulder: {{ x: {s.shoulder[0]:.3f}, z: {s.shoulder[1]:.3f} }},
    jaw: {fmt_vec3(s.jaw)},
    eye: {{ x: {s.eye[0]:.3f}, y: {s.eye[1]:.3f}, z: {s.eye[2]:.3f} }},
    brow: {{ x: {s.brow[0]:.3f}, y: {s.brow[1]:.3f}, z: {s.brow[2]:.3f} }},
    arm: {{
      position: {fmt_vec3(s.arm[0])},
      rotation: {fmt_vec3(s.arm[1])},
    }},
    tailRoot: {{
      position: {fmt_vec3(s.tail_root[0])},
      rotation: {fmt_vec3(s.tail_root[1])},
    }},
    accessory: {fmt_vec3(s.accessory)},
    tailLength: {s.tail_length:.3f},
  }}"""
        )
    body_block = ",\n".join(bodies)
    stubby = drops["stubby"]
    stilts = drops["stilts"]
    paddles = drops["paddles"]
    content = f"""/**
 * Generated by scripts/blender/build_saurians.py — do not hand-edit.
 * Re-export: blender --background --python scripts/blender/build_saurians.py
 */
import type {{ BodyId, LegId }} from "./types";

export const SAURIAN_KIT_URL = "/models/saurian-kit.glb";

export type KitSockets = {{
  stance: "biped" | "quad";
  pitch: number;
  hip: {{ x: number; z: number }};
  shoulder: {{ x: number; z: number }};
  jaw: [number, number, number];
  eye: {{ x: number; y: number; z: number }};
  brow: {{ x: number; y: number; z: number }};
  arm: {{ position: [number, number, number]; rotation: [number, number, number] }};
  tailRoot: {{
    position: [number, number, number];
    rotation: [number, number, number];
  }};
  accessory: [number, number, number];
  tailLength: number;
}};

export const KIT_SOCKETS: Record<BodyId, KitSockets> = {{
{body_block},
}};

export const LEG_DROP: Record<LegId, number> = {{
  stubby: {stubby:.3f},
  stilts: {stilts:.3f},
  paddles: {paddles:.3f},
}};
"""
    path.write_text(content)
    print(f"Wrote sockets {path}")


def main() -> None:
    out = parse_out()
    reset_scene()
    mats = ensure_mats()

    sockets = {
        "sleek": build_theropod(mats),
        "plump": build_sauropod(mats),
        "spiky": build_stego(mats),
    }
    drops = {
        "stilts": build_leg("legs_stilts", mats, "stilts"),
        "stubby": build_leg("legs_stubby", mats, "stubby"),
        "paddles": build_leg("legs_paddles", mats, "paddles"),
    }
    build_mouth("mouth_maw", mats, "maw")
    build_mouth("mouth_beak", mats, "beak")
    build_mouth("mouth_sucker", mats, "sucker")
    build_eyes("eyes_beads", mats, "beads")
    build_eyes("eyes_stalks", mats, "stalks")
    build_eyes("eyes_wide", mats, "wide")
    build_arms("arms_none", mats, "none")
    build_arms("arms_grabbers", mats, "grabbers")
    build_arms("arms_fins", mats, "fins")
    build_tail("tail_none", mats, "none", 1.42)
    build_tail("tail_whip", mats, "whip", 1.42)
    build_tail("tail_club", mats, "club", 1.42)
    build_tail("tail_fan", mats, "fan", 1.42)
    build_accessory("accessory_spikes", mats, "spikes")
    build_accessory("accessory_frill", mats, "frill")
    build_accessory("accessory_antenna", mats, "antenna")

    bake_mesh_rot_scale()

    export_glb(out)
    write_sockets_ts(SOCKETS_TS, sockets, drops)
    size = out.stat().st_size if out.exists() else 0
    print(json.dumps({"out": str(out), "bytes": size, "objects": len(bpy.data.objects)}))


if __name__ == "__main__":
    main()
