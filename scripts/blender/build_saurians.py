#!/usr/bin/env python3
"""Build Tideform saurian GLB kit (Blender 4.2, headless).

Mid-poly coastal saurians: anatomical lofts (superellipse + dorsal peak +
cream belly), separate skulls, digitigrade/pillar legs, Spore accents.
Not lathe primitives, not candy toys, not grimdark.

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
from ctypes.util import find_library
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
    # Superellipse exponent (2 = ellipse, ~2.6 = fleshy / boxy skull).
    power: float = 2.2
    # Extra dorsal height (peaked back).
    peak: float = 0.0
    # Ventral flatten 0–1 (herbivore belly / saurian keel).
    flat: float = 0.32


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


def parse_args() -> tuple[Path, Path | None]:
    out = DEFAULT_OUT
    preview: Path | None = None
    argv = sys.argv
    if "--" in argv:
        extra = argv[argv.index("--") + 1 :]
        if "--out" in extra:
            out = Path(extra[extra.index("--out") + 1]).resolve()
        if "--preview" in extra:
            idx = extra.index("--preview")
            preview = (
                Path(extra[idx + 1]).resolve()
                if idx + 1 < len(extra) and not extra[idx + 1].startswith("--")
                else ROOT / "scripts" / "blender" / "previews"
            )
    return out, preview


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
    # glTF +Y up export maps Blender +Y → glTF -Z. Store creature forward
    # as Blender -Y so the kit faces +Z in Three/R3F.
    return Vector((x, -z, y))


def set_creature_location(obj: bpy.types.Object, x: float, y: float, z: float) -> None:
    obj.location = creature_to_blender(x, y, z)


def set_creature_rotation(obj: bpy.types.Object, rx: float, ry: float, rz: float) -> None:
    # Creature XYZ (pitch, yaw, roll) after mapping forward to Blender -Y.
    obj.rotation_mode = "XYZ"
    obj.rotation_euler = Euler((rx, -rz, ry), "XYZ")


def mat(name: str, color: tuple[float, float, float, float], roughness: float, spec: float = 0.32) -> bpy.types.Material:
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
            bsdf.inputs["Specular IOR Level"].default_value = spec
        if "Coat Weight" in bsdf.inputs and roughness < 0.35:
            bsdf.inputs["Coat Weight"].default_value = 0.08
        if "Subsurface Weight" in bsdf.inputs and "skin" in name:
            bsdf.inputs["Subsurface Weight"].default_value = 0.08
            if "Subsurface Radius" in bsdf.inputs:
                bsdf.inputs["Subsurface Radius"].default_value = (0.4, 0.22, 0.16)
    material.diffuse_color = color
    return material


def ensure_mats() -> dict[str, bpy.types.Material]:
    return {
        "skin": mat("mat_skin", SEAFOAM, 0.58, 0.34),
        "skin_sage": mat("mat_skin_sage", SAGE, 0.6, 0.32),
        "skin_deep": mat("mat_skin_deep", SEAFOAM_DEEP, 0.56, 0.33),
        "keratin": mat("mat_keratin", KERATIN, 0.42, 0.4),
        "plate": mat("mat_plate", SHELL, 0.48, 0.38),
        "cream": mat("mat_cream", CREAM, 0.54, 0.3),
        "claw": mat("mat_claw", CLAW, 0.36, 0.28),
        "wet": mat("mat_wet", WET, 0.22, 0.55),
        "eye": mat("mat_eye", EYE, 0.12, 0.7),
        "pupil": mat("mat_pupil", PUPIL, 0.18, 0.25),
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
        mesh.auto_smooth_angle = math.radians(48)


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


def mesh_tris(obj: bpy.types.Object) -> int:
    if obj.type != "MESH":
        return 0
    mesh = obj.data
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def subtree_tris(root: bpy.types.Object) -> int:
    total = mesh_tris(root)
    for child in root.children_recursive:
        total += mesh_tris(child)
    return total


# ---------------------------------------------------------------------------
# Geometry builders
# ---------------------------------------------------------------------------


def _hex_fill(u: float, v: float, cells: float = 9.0) -> float:
    uu = u * cells
    vv = v * cells
    row = math.floor(vv)
    hx = uu + (row % 2) * 0.5
    cx = hx - math.floor(hx) - 0.5
    cy = vv - row - 0.5
    d = math.sqrt(cx * cx + cy * cy)
    return max(0.0, 1.0 - d / 0.42)


def _ring_axes(ring: Ring, ang: float) -> tuple[float, float]:
    c = math.cos(ang)
    s = math.sin(ang)
    n = max(1.35, ring.power)
    ax = ring.rx * math.copysign(abs(c) ** (2.0 / n), c) if abs(c) > 1e-8 else 0.0
    ay = ring.ry * math.copysign(abs(s) ** (2.0 / n), s) if abs(s) > 1e-8 else 0.0
    if s > 0.0:
        ay *= 1.0 + ring.peak * (s * s)
    else:
        ay *= max(0.38, 1.0 - ring.flat * (s * s) * 0.52)
    return ax, ay


def _belly_color(cream: float, ang: float) -> tuple[float, float, float, float]:
    belly = max(0.0, -math.sin(ang))
    back = max(0.0, math.sin(ang))
    mix = min(1.0, cream + belly * 0.84)
    return (
        0.70 + mix * 0.30 - back * 0.05,
        0.80 + mix * 0.14 - back * 0.02,
        0.76 + mix * 0.10 + back * 0.05,
        1.0,
    )


def loft_rings(rings: list[Ring], segs: int = 12, scales: float = 0.0) -> bmesh.types.BMesh:
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
            ax, ay = _ring_axes(ring, ang)
            offset = binormals[i] * ax + normals[i] * ay
            vert = bm.verts.new(center + offset)
            row.append(vert)
            row_col.append(_belly_color(ring.cream, ang))
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
        col = _belly_color(cream, -math.pi / 2 if flip else math.pi / 2)
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

    if scales > 0.0:
        _displace_scales(bm, uv_layer, scales)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def _displace_scales(bm: bmesh.types.BMesh, uv_layer, amount: float) -> None:
    bm.verts.ensure_lookup_table()
    uv_avg: dict[int, tuple[float, float]] = {}
    uv_n: dict[int, int] = {}
    for vert in bm.verts:
        ux = 0.0
        uy = 0.0
        n = 0
        for loop in vert.link_loops:
            uv = loop[uv_layer].uv
            ux += uv.x
            uy += uv.y
            n += 1
        if n:
            uv_avg[vert.index] = (ux / n, uy / n)
            uv_n[vert.index] = n
    for vert in bm.verts:
        uv = uv_avg.get(vert.index)
        if uv is None or uv_n.get(vert.index, 0) < 3:
            continue
        fill = _hex_fill(uv[0], uv[1])
        # Tasteful scale, not crocodile armor — lift the plate, sink the seam.
        vert.co += vert.normal * amount * (fill - 0.32)


def make_loft(
    name: str,
    rings: list[Ring],
    parent: bpy.types.Object | None,
    material: bpy.types.Material,
    segs: int = 12,
    levels: int = 0,
    scales: float = 0.0,
) -> bpy.types.Object:
    obj = object_from_bmesh(name, loft_rings(rings, segs=segs, scales=scales), parent, material)
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
        Ring(z=0.0, y=0.0, rx=radius * 1.05, ry=radius * 0.92, power=2.4, cream=0.15),
        Ring(z=0.012, y=length * 0.32, rx=radius * 0.78, ry=radius * 0.68, power=2.3),
        Ring(z=0.02, y=length * 0.68, rx=radius * 0.36, ry=radius * 0.32, power=2.2),
        Ring(z=0.014, y=length, rx=0.004, ry=0.004, cream=0.4, power=2.0),
    ]
    return make_loft(name, rings, parent, material, segs=8, levels=0)


def make_spiral_shell(
    name: str,
    parent: bpy.types.Object,
    material: bpy.types.Material,
    turns: float = 2.15,
    path_segs: int = 18,
    radial: int = 6,
) -> bpy.types.Object:
    path: list[Vector] = []
    radii: list[float] = []
    for i in range(path_segs + 1):
        u = i / path_segs
        theta = 0.62 + u * turns * math.tau
        grow = math.exp(0.18 * theta)
        radius = 0.011 * grow
        # Aperture flares; inner coil stays tight like an ammonite.
        tube = 0.01 + 0.05 * (u**1.15)
        x = radius * math.cos(theta)
        z = radius * math.sin(theta) * 0.92
        y = 0.01 * u + 0.004 * math.sin(theta)
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
            bm.faces.new((rows[i][s], rows[i + 1][s], rows[i + 1][s2], rows[i][s2]))
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
        Ring(z=-rz, y=0.0, rx=rx * 0.38, ry=ry * 0.3, cream=0.55, power=2.5, peak=0.15),
        Ring(z=0.0, y=ry * 0.22, rx=rx, ry=ry, cream=0.45, power=2.4, peak=0.35),
        Ring(z=rz, y=0.0, rx=rx * 0.38, ry=ry * 0.3, cream=0.55, power=2.5, peak=0.15),
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
    rings = [
        Ring(z=0.0, y=0.0, rx=0.022, ry=0.014, cream=0.4, power=2.6, flat=0.1),
        Ring(z=0.018, y=height * 0.22, rx=width * 0.42, ry=thick * 1.05, cream=0.5, power=2.5),
        Ring(z=0.022, y=height * 0.48, rx=width * 0.52, ry=thick, cream=0.55, power=2.4),
        Ring(z=0.016, y=height * 0.74, rx=width * 0.22, ry=thick * 0.62, cream=0.6, power=2.3),
        Ring(z=0.008, y=height, rx=0.01, ry=0.008, cream=0.65, power=2.1),
    ]
    return make_loft(name, rings, parent, material, segs=10, levels=0)


def make_toe(
    name: str,
    parent: bpy.types.Object,
    material: bpy.types.Material,
    length: float = 0.12,
) -> bpy.types.Object:
    rings = [
        Ring(z=0.0, y=0.0, rx=0.02, ry=0.017, power=2.4, cream=0.1),
        Ring(z=length * 0.38, y=-0.006, rx=0.016, ry=0.013, power=2.3),
        Ring(z=length * 0.72, y=-0.012, rx=0.009, ry=0.008, cream=0.2, power=2.2),
        Ring(z=length, y=-0.01, rx=0.003, ry=0.003, cream=0.3, power=2.0),
    ]
    return make_loft(name, rings, parent, material, segs=7, levels=0)


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
    """Biped hunter: hip-heavy, wasp waist, S-neck, boxy skull, nape spirals."""
    root = make_empty("chassis_sleek")

    body = [
        Ring(z=-0.50, y=0.16, rx=0.07, ry=0.07, power=2.3, peak=0.08, flat=0.2),
        Ring(z=-0.34, y=0.20, rx=0.20, ry=0.24, power=2.35, peak=0.18, flat=0.28, cream=0.08),
        Ring(z=-0.16, y=0.22, rx=0.24, ry=0.30, power=2.4, peak=0.28, flat=0.38, cream=0.12),
        Ring(z=0.02, y=0.20, rx=0.20, ry=0.26, power=2.35, peak=0.22, flat=0.4, cream=0.18),
        Ring(z=0.18, y=0.22, rx=0.17, ry=0.23, power=2.3, peak=0.16, flat=0.36, cream=0.16),
        Ring(z=0.36, y=0.28, rx=0.22, ry=0.32, power=2.4, peak=0.22, flat=0.34, cream=0.14),
        Ring(z=0.52, y=0.34, rx=0.24, ry=0.34, power=2.45, peak=0.18, flat=0.3, cream=0.12),
        Ring(z=0.66, y=0.40, rx=0.16, ry=0.24, power=2.3, peak=0.12, flat=0.28, cream=0.1),
        Ring(z=0.78, y=0.48, rx=0.11, ry=0.15, power=2.25, peak=0.08, flat=0.22),
    ]
    make_loft("sleek_body", body, root, mats["skin"], segs=14, levels=0, scales=0.0038)

    neck = [
        Ring(z=0.78, y=0.48, rx=0.11, ry=0.14, power=2.25, peak=0.1, flat=0.2),
        Ring(z=0.90, y=0.54, rx=0.10, ry=0.13, power=2.3, peak=0.12, flat=0.18, cream=0.08),
        Ring(z=1.00, y=0.58, rx=0.11, ry=0.13, power=2.35, peak=0.1, flat=0.16, cream=0.12),
    ]
    make_loft("sleek_neck", neck, root, mats["skin"], segs=12, levels=0, scales=0.0028)

    head = [
        Ring(z=1.00, y=0.58, rx=0.12, ry=0.13, power=2.5, peak=0.08, flat=0.12, cream=0.15),
        Ring(z=1.10, y=0.60, rx=0.15, ry=0.15, power=2.65, peak=0.12, flat=0.14, cream=0.28),
        Ring(z=1.20, y=0.57, rx=0.16, ry=0.13, power=2.55, peak=0.06, flat=0.18, cream=0.55),
        Ring(z=1.30, y=0.52, rx=0.12, ry=0.09, power=2.4, flat=0.2, cream=0.82),
        Ring(z=1.38, y=0.49, rx=0.07, ry=0.055, power=2.3, cream=0.95),
    ]
    make_loft("sleek_head", head, root, mats["skin"], segs=12, levels=0, scales=0.002)

    for side, sx in (("L", 1.0), ("R", -1.0)):
        nostril = make_loft(
            f"sleek_nostril_{side}",
            [
                Ring(z=0.0, y=0.0, rx=0.012, ry=0.008, cream=0.7, power=2.4),
                Ring(z=0.01, y=0.004, rx=0.01, ry=0.007, cream=0.6),
                Ring(z=0.016, y=0.002, rx=0.004, ry=0.003, cream=0.5),
            ],
            root,
            mats["wet"],
            segs=6,
        )
        set_creature_location(nostril, 0.045 * sx, 0.54, 1.34)

        horn = make_horn(f"sleek_horn_{side}", root, mats["keratin"], length=0.12, radius=0.024)
        set_creature_location(horn, 0.085 * sx, 0.70, 1.08)
        set_creature_rotation(horn, 0.38, 0.1 * sx, -0.58 * sx)

        ring = make_loft(
            f"sleek_eyerim_{side}",
            [
                Ring(z=-0.012, y=0.0, rx=0.058, ry=0.05, cream=0.82, power=2.4),
                Ring(z=0.0, y=0.0, rx=0.066, ry=0.056, cream=0.88, power=2.35),
                Ring(z=0.014, y=0.0, rx=0.05, ry=0.044, cream=0.8, power=2.3),
            ],
            root,
            mats["plate"],
            segs=12,
        )
        set_creature_location(ring, 0.155 * sx, 0.62, 1.14)

    shells = [
        (0.0, 0.66, 0.82, 1.18, (-0.58, 0.0, 0.0)),
        (0.11, 0.60, 0.64, 1.22, (-0.42, 0.52, 0.08)),
        (-0.11, 0.60, 0.64, 1.22, (-0.42, -0.52, -0.08)),
        (0.13, 0.56, 0.44, 1.28, (-0.3, 0.68, 0.1)),
        (-0.13, 0.56, 0.44, 1.28, (-0.3, -0.68, -0.1)),
        (0.10, 0.50, 0.24, 0.95, (-0.2, 0.48, 0.06)),
        (-0.10, 0.50, 0.24, 0.95, (-0.2, -0.48, -0.06)),
    ]
    for i, (x, y, z, sc, rot) in enumerate(shells):
        place_shell(root, mats, f"sleek_shell_{i}", x, y, z, sc, rot)

    for i, z in enumerate((0.58, 0.38, 0.16, -0.04, -0.24)):
        nub = make_osteoderm(f"sleek_ost_{i}", root, mats["plate"], rx=0.042, ry=0.028, rz=0.036)
        set_creature_location(nub, 0.0, 0.46 - i * 0.018, z)

    place_socket(root, "socket_sleek_eye_L", 0.155, 0.62, 1.16)
    place_socket(root, "socket_sleek_eye_R", -0.155, 0.62, 1.16)
    place_socket(root, "socket_sleek_jaw", 0.0, 0.46, 1.36)
    place_socket(root, "socket_sleek_arm_L", 0.23, 0.24, 0.50)
    place_socket(root, "socket_sleek_arm_R", -0.23, 0.24, 0.50)
    place_socket(root, "socket_sleek_tail", 0.0, 0.16, -0.46)
    place_socket(root, "socket_sleek_hip_L", 0.17, 0.0, -0.10)
    place_socket(root, "socket_sleek_hip_R", -0.17, 0.0, -0.10)
    place_socket(root, "socket_sleek_brow_L", 0.09, 0.70, 1.06)
    place_socket(root, "socket_sleek_brow_R", -0.09, 0.70, 1.06)
    place_socket(root, "socket_sleek_acc", 0.0, 0.58, 0.18)

    return SocketSet(
        stance="biped",
        pitch=-0.05,
        hip=(0.17, -0.10),
        shoulder=(0.23, 0.50),
        jaw=(0.0, 0.46, 1.36),
        eye=(0.155, 0.62, 1.16),
        brow=(0.09, 0.70, 1.06),
        arm=((0.23, 0.24, 0.50), (0.82, 0.0, 0.82)),
        tail_root=((0.0, 0.16, -0.46), (-0.10, 0.0, 0.0)),
        accessory=(0.0, 0.58, 0.18),
        tail_length=1.32,
    )


def build_sauropod(mats: dict[str, bpy.types.Material]) -> SocketSet:
    """Long-neck grazer: barrel torso, S-neck, tiny skull, nape spirals."""
    root = make_empty("chassis_plump")

    barrel = [
        Ring(z=-0.78, y=0.18, rx=0.12, ry=0.12, power=2.3, peak=0.06, flat=0.18),
        Ring(z=-0.56, y=0.24, rx=0.36, ry=0.34, power=2.45, peak=0.16, flat=0.42, cream=0.1),
        Ring(z=-0.28, y=0.26, rx=0.48, ry=0.44, power=2.5, peak=0.22, flat=0.5, cream=0.16),
        Ring(z=0.04, y=0.26, rx=0.50, ry=0.46, power=2.5, peak=0.24, flat=0.52, cream=0.2),
        Ring(z=0.36, y=0.28, rx=0.42, ry=0.40, power=2.45, peak=0.2, flat=0.46, cream=0.16),
        Ring(z=0.62, y=0.32, rx=0.28, ry=0.28, power=2.4, peak=0.14, flat=0.36, cream=0.1),
        Ring(z=0.84, y=0.38, rx=0.16, ry=0.18, power=2.3, peak=0.1, flat=0.24, cream=0.08),
    ]
    make_loft("plump_body", barrel, root, mats["skin_deep"], segs=14, levels=0, scales=0.0042)

    neck = [
        Ring(z=0.84, y=0.38, rx=0.15, ry=0.16, power=2.3, peak=0.08, flat=0.2),
        Ring(z=1.08, y=0.46, rx=0.12, ry=0.13, power=2.3, peak=0.1, flat=0.18, cream=0.06),
        Ring(z=1.34, y=0.56, rx=0.105, ry=0.11, power=2.25, peak=0.08, flat=0.16),
        Ring(z=1.62, y=0.66, rx=0.095, ry=0.10, power=2.25, peak=0.08, flat=0.14, cream=0.08),
        Ring(z=1.90, y=0.74, rx=0.09, ry=0.095, power=2.3, peak=0.06, flat=0.12, cream=0.1),
        Ring(z=2.16, y=0.78, rx=0.088, ry=0.09, power=2.3, peak=0.05, flat=0.12, cream=0.14),
        Ring(z=2.36, y=0.76, rx=0.09, ry=0.088, power=2.35, peak=0.04, flat=0.14, cream=0.22),
    ]
    make_loft("plump_neck", neck, root, mats["skin_deep"], segs=12, levels=0, scales=0.0024)

    head = [
        Ring(z=2.36, y=0.76, rx=0.09, ry=0.09, power=2.45, cream=0.22),
        Ring(z=2.46, y=0.75, rx=0.12, ry=0.11, power=2.55, cream=0.45, flat=0.16),
        Ring(z=2.56, y=0.72, rx=0.11, ry=0.09, power=2.45, cream=0.75, flat=0.18),
        Ring(z=2.66, y=0.68, rx=0.06, ry=0.05, power=2.3, cream=0.95),
    ]
    make_loft("plump_head", head, root, mats["skin_deep"], segs=12, levels=0, scales=0.0016)

    nape = [
        (0.0, 0.52, 0.92, 0.88, (-0.48, 0.0, 0.0)),
        (0.0, 0.60, 1.22, 0.72, (-0.36, 0.0, 0.0)),
        (0.0, 0.68, 1.54, 0.58, (-0.26, 0.0, 0.0)),
        (0.0, 0.76, 1.84, 0.48, (-0.16, 0.0, 0.0)),
        (0.0, 0.58, 0.48, 1.12, (-0.28, 0.0, 0.0)),
        (0.18, 0.54, 0.22, 0.92, (-0.2, 0.55, 0.1)),
        (-0.18, 0.54, 0.22, 0.92, (-0.2, -0.55, -0.1)),
        (0.0, 0.56, 0.02, 1.0, (-0.14, 0.0, 0.0)),
        (0.0, 0.50, -0.24, 0.78, (-0.08, 0.0, 0.0)),
    ]
    for i, (x, y, z, sc, rot) in enumerate(nape):
        place_shell(root, mats, f"plump_shell_{i}", x, y, z, sc, rot)

    for i, z in enumerate((0.30, 0.06, -0.18)):
        nub = make_osteoderm(f"plump_ost_{i}", root, mats["plate"], rx=0.058, ry=0.034, rz=0.042)
        set_creature_location(nub, 0.0, 0.54 - i * 0.03, z)

    place_socket(root, "socket_plump_eye_L", 0.11, 0.80, 2.50)
    place_socket(root, "socket_plump_eye_R", -0.11, 0.80, 2.50)
    place_socket(root, "socket_plump_jaw", 0.0, 0.66, 2.64)
    place_socket(root, "socket_plump_arm_L", 0.42, 0.20, 0.52)
    place_socket(root, "socket_plump_arm_R", -0.42, 0.20, 0.52)
    place_socket(root, "socket_plump_tail", 0.0, 0.18, -0.70)
    place_socket(root, "socket_plump_hip_L", 0.30, 0.0, -0.40)
    place_socket(root, "socket_plump_hip_R", -0.30, 0.0, -0.40)
    place_socket(root, "socket_plump_brow_L", 0.08, 0.86, 2.40)
    place_socket(root, "socket_plump_brow_R", -0.08, 0.86, 2.40)
    place_socket(root, "socket_plump_acc", 0.0, 0.58, 0.16)
    place_socket(root, "socket_plump_sh_L", 0.30, 0.0, 0.54)
    place_socket(root, "socket_plump_sh_R", -0.30, 0.0, 0.54)

    return SocketSet(
        stance="quad",
        pitch=0.02,
        hip=(0.30, -0.40),
        shoulder=(0.30, 0.54),
        jaw=(0.0, 0.66, 2.64),
        eye=(0.11, 0.80, 2.50),
        brow=(0.08, 0.86, 2.40),
        arm=((0.42, 0.20, 0.52), (0.10, 0.0, 0.28)),
        tail_root=((0.0, 0.18, -0.70), (-0.20, 0.0, 0.0)),
        accessory=(0.0, 0.58, 0.16),
        tail_length=1.62,
    )


def build_stego(mats: dict[str, bpy.types.Material]) -> SocketSet:
    """Beaked herbivore: high arch, staggered kite plates, small low head."""
    root = make_empty("chassis_spiky")

    body = [
        Ring(z=-0.86, y=0.16, rx=0.11, ry=0.11, power=2.3, peak=0.08, flat=0.2),
        Ring(z=-0.62, y=0.26, rx=0.30, ry=0.32, power=2.4, peak=0.28, flat=0.36, cream=0.08),
        Ring(z=-0.32, y=0.36, rx=0.40, ry=0.46, power=2.5, peak=0.42, flat=0.44, cream=0.12),
        Ring(z=0.00, y=0.38, rx=0.42, ry=0.50, power=2.55, peak=0.48, flat=0.46, cream=0.14),
        Ring(z=0.30, y=0.32, rx=0.36, ry=0.40, power=2.45, peak=0.36, flat=0.4, cream=0.12),
        Ring(z=0.56, y=0.24, rx=0.28, ry=0.28, power=2.4, peak=0.22, flat=0.34, cream=0.1),
        Ring(z=0.78, y=0.20, rx=0.18, ry=0.18, power=2.3, peak=0.12, flat=0.26, cream=0.08),
        Ring(z=0.98, y=0.22, rx=0.13, ry=0.13, power=2.3, peak=0.08, flat=0.2, cream=0.1),
        Ring(z=1.18, y=0.26, rx=0.11, ry=0.11, power=2.35, peak=0.06, flat=0.16, cream=0.16),
        Ring(z=1.36, y=0.28, rx=0.10, ry=0.10, power=2.4, cream=0.28, flat=0.14),
        Ring(z=1.50, y=0.27, rx=0.085, ry=0.08, power=2.4, cream=0.4, flat=0.12),
        Ring(z=1.62, y=0.24, rx=0.055, ry=0.048, power=2.3, cream=0.55),
    ]
    make_loft("spiky_body", body, root, mats["skin_sage"], segs=14, levels=0, scales=0.0036)

    plates = [
        (-0.055, 0.40, 0.58, 0.34, 0.18, 0.10),
        (0.058, 0.50, 0.34, 0.50, 0.22, 0.04),
        (-0.06, 0.60, 0.10, 0.66, 0.26, 0.0),
        (0.062, 0.66, -0.12, 0.74, 0.28, -0.04),
        (-0.05, 0.60, -0.34, 0.64, 0.24, -0.08),
        (0.048, 0.48, -0.52, 0.48, 0.20, -0.14),
        (-0.04, 0.36, -0.68, 0.32, 0.15, -0.2),
        (0.03, 0.26, -0.82, 0.20, 0.11, -0.26),
    ]
    for i, (x, y, z, h, w, pitch) in enumerate(plates):
        plate = make_kite_plate(f"spiky_plate_{i}", root, mats["plate"], height=h, width=w, thick=0.038)
        set_creature_location(plate, x, y, z)
        set_creature_rotation(plate, pitch, 0.0, 0.0)
        if i in (1, 3, 5):
            place_shell(root, mats, f"spiky_plateshell_{i}", x + 0.028, y + h * 0.4, z, 0.52, (0.0, 1.15, 0.0))

    flanks = [
        (0.32, 0.40, 0.22, 1.15, (-0.12, 1.05, 0.1)),
        (-0.32, 0.40, 0.22, 1.15, (-0.12, -1.05, -0.1)),
        (0.28, 0.38, 0.0, 0.92, (-0.06, 1.0, 0.08)),
        (-0.28, 0.38, 0.0, 0.92, (-0.06, -1.0, -0.08)),
        (0.24, 0.32, -0.24, 0.74, (-0.04, 0.95, 0.06)),
        (-0.24, 0.32, -0.24, 0.74, (-0.04, -0.95, -0.06)),
    ]
    for i, (x, y, z, sc, rot) in enumerate(flanks):
        place_shell(root, mats, f"spiky_flank_{i}", x, y, z, sc, rot)

    place_socket(root, "socket_spiky_eye_L", 0.095, 0.32, 1.48)
    place_socket(root, "socket_spiky_eye_R", -0.095, 0.32, 1.48)
    place_socket(root, "socket_spiky_jaw", 0.0, 0.20, 1.66)
    place_socket(root, "socket_spiky_arm_L", 0.38, 0.16, 0.46)
    place_socket(root, "socket_spiky_arm_R", -0.38, 0.16, 0.46)
    place_socket(root, "socket_spiky_tail", 0.0, 0.16, -0.80)
    place_socket(root, "socket_spiky_hip_L", 0.32, 0.0, -0.40)
    place_socket(root, "socket_spiky_hip_R", -0.32, 0.0, -0.40)
    place_socket(root, "socket_spiky_brow_L", 0.07, 0.38, 1.36)
    place_socket(root, "socket_spiky_brow_R", -0.07, 0.38, 1.36)
    place_socket(root, "socket_spiky_acc", 0.0, 0.52, 0.08)
    place_socket(root, "socket_spiky_sh_L", 0.30, 0.0, 0.50)
    place_socket(root, "socket_spiky_sh_R", -0.30, 0.0, 0.50)

    return SocketSet(
        stance="quad",
        pitch=0.03,
        hip=(0.32, -0.40),
        shoulder=(0.30, 0.50),
        jaw=(0.0, 0.20, 1.66),
        eye=(0.095, 0.32, 1.48),
        brow=(0.07, 0.38, 1.36),
        arm=((0.38, 0.16, 0.46), (0.08, 0.0, 0.20)),
        tail_root=((0.0, 0.16, -0.80), (-0.12, 0.0, 0.0)),
        accessory=(0.0, 0.52, 0.08),
        tail_length=1.52,
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
        # Digitigrade: thick thigh, thin shin, long foot.
        rings = [
            Ring(z=0.03, y=0.02, rx=0.13, ry=0.14, power=2.4, peak=0.08, flat=0.18),
            Ring(z=0.08, y=-0.16, rx=0.16, ry=0.17, power=2.45, peak=0.1, flat=0.22, cream=0.06),
            Ring(z=0.07, y=-0.34, rx=0.12, ry=0.13, power=2.4, peak=0.06, flat=0.18),
            Ring(z=0.04, y=-0.42, rx=0.085, ry=0.09, power=2.3, cream=0.08),
            Ring(z=0.02, y=-0.58, rx=0.062, ry=0.06, power=2.25, cream=0.18),
            Ring(z=0.06, y=-0.76, rx=0.05, ry=0.048, power=2.2, cream=0.35),
            Ring(z=0.12, y=-0.86, rx=0.055, ry=0.04, power=2.3, cream=0.48),
            Ring(z=0.20, y=-0.91, rx=0.10, ry=0.038, power=2.4, cream=0.58, flat=0.15),
            Ring(z=0.28, y=-0.92, rx=0.07, ry=0.028, power=2.3, cream=0.62),
        ]
        drop = 0.94
        toe_y, toe_z = -0.92, 0.26
        toe_len = 0.14
    elif kind == "stubby":
        rings = [
            Ring(z=0.0, y=0.02, rx=0.13, ry=0.13, power=2.4, peak=0.06, flat=0.2),
            Ring(z=0.02, y=-0.14, rx=0.145, ry=0.14, power=2.45, peak=0.08, flat=0.22, cream=0.08),
            Ring(z=0.03, y=-0.28, rx=0.12, ry=0.12, power=2.4, cream=0.1),
            Ring(z=0.04, y=-0.40, rx=0.11, ry=0.09, power=2.35, cream=0.28),
            Ring(z=0.08, y=-0.50, rx=0.14, ry=0.055, power=2.4, cream=0.5, flat=0.12),
            Ring(z=0.16, y=-0.53, rx=0.12, ry=0.04, power=2.3, cream=0.58),
        ]
        drop = 0.56
        toe_y, toe_z = -0.53, 0.16
        toe_len = 0.1
    else:
        rings = [
            Ring(z=0.0, y=0.02, rx=0.13, ry=0.12, power=2.4, peak=0.05, flat=0.18),
            Ring(z=0.02, y=-0.14, rx=0.15, ry=0.14, power=2.45, cream=0.08),
            Ring(z=0.04, y=-0.30, rx=0.14, ry=0.11, power=2.4, cream=0.16),
            Ring(z=0.08, y=-0.44, rx=0.17, ry=0.06, power=2.4, cream=0.42, flat=0.1),
            Ring(z=0.18, y=-0.50, rx=0.16, ry=0.042, power=2.35, cream=0.55),
            Ring(z=0.26, y=-0.51, rx=0.12, ry=0.032, power=2.3, cream=0.6),
        ]
        drop = 0.54
        toe_y, toe_z = -0.50, 0.22
        toe_len = 0.1

    make_loft(f"{name}_limb", rings, root, mats["skin"], segs=12, levels=0, scales=0.0024)
    for i, ox in enumerate((-0.05, 0.0, 0.05)):
        toe = make_toe(f"{name}_toe_{i}", root, mats["claw"], length=toe_len)
        set_creature_location(toe, ox, toe_y, toe_z)
        if kind == "stilts" and i == 1:
            set_creature_rotation(toe, 0.06, 0.0, 0.0)
    if kind == "stilts":
        dew = make_toe(f"{name}_dew", root, mats["claw"], length=0.075)
        set_creature_location(dew, 0.03, -0.78, 0.0)
        set_creature_rotation(dew, 2.35, 0.0, 0.0)
    return drop


def build_mouth(name: str, mats: dict[str, bpy.types.Material], kind: str) -> None:
    root = make_empty(name)
    if kind == "maw":
        make_loft(
            f"{name}_upper",
            [
                Ring(z=0.0, y=0.03, rx=0.10, ry=0.045, cream=0.7, power=2.5, flat=0.1),
                Ring(z=0.07, y=0.02, rx=0.09, ry=0.04, cream=0.82, power=2.45),
                Ring(z=0.14, y=0.0, rx=0.06, ry=0.026, cream=0.9, power=2.35),
                Ring(z=0.20, y=-0.012, rx=0.028, ry=0.014, cream=0.95, power=2.2),
            ],
            root,
            mats["cream"],
            segs=12,
        )
        make_loft(
            f"{name}_lower",
            [
                Ring(z=0.0, y=-0.035, rx=0.09, ry=0.032, cream=0.62, power=2.45),
                Ring(z=0.09, y=-0.048, rx=0.07, ry=0.024, cream=0.72, power=2.35),
                Ring(z=0.16, y=-0.04, rx=0.04, ry=0.016, cream=0.82, power=2.25),
                Ring(z=0.20, y=-0.028, rx=0.016, ry=0.01, cream=0.88, power=2.1),
            ],
            root,
            mats["cream"],
            segs=10,
        )
        gum = make_loft(
            f"{name}_gum",
            [
                Ring(z=0.02, y=-0.006, rx=0.078, ry=0.012, cream=0.4, power=2.3),
                Ring(z=0.12, y=-0.01, rx=0.05, ry=0.01, cream=0.35),
            ],
            root,
            mats["wet"],
            segs=8,
        )
        set_creature_location(gum, 0.0, 0.0, 0.0)
        for i, (x, z) in enumerate(((-0.05, 0.06), (-0.02, 0.1), (0.02, 0.1), (0.05, 0.06), (-0.035, 0.14), (0.035, 0.14), (0.0, 0.17))):
            tooth = make_loft(
                f"{name}_tooth_{i}",
                [
                    Ring(z=0.0, y=0.0, rx=0.009, ry=0.011, power=2.2),
                    Ring(z=0.0, y=-0.03, rx=0.005, ry=0.005),
                    Ring(z=0.0, y=-0.044, rx=0.002, ry=0.002, cream=0.25),
                ],
                root,
                mats["keratin"],
                segs=5,
            )
            set_creature_location(tooth, x, -0.008, z)
    elif kind == "beak":
        make_loft(
            f"{name}_sheath",
            [
                Ring(z=0.0, y=0.016, rx=0.06, ry=0.034, cream=0.42, power=2.5, flat=0.08),
                Ring(z=0.06, y=0.006, rx=0.046, ry=0.024, cream=0.32, power=2.4),
                Ring(z=0.12, y=-0.012, rx=0.024, ry=0.014, cream=0.22, power=2.3),
                Ring(z=0.18, y=-0.032, rx=0.01, ry=0.008, cream=0.18, power=2.1),
                Ring(z=0.21, y=-0.042, rx=0.004, ry=0.004, cream=0.16),
            ],
            root,
            mats["keratin"],
            segs=10,
        )
        make_loft(
            f"{name}_lower",
            [
                Ring(z=0.015, y=-0.022, rx=0.046, ry=0.018, cream=0.32, power=2.4),
                Ring(z=0.09, y=-0.034, rx=0.024, ry=0.012, cream=0.22, power=2.3),
                Ring(z=0.15, y=-0.042, rx=0.01, ry=0.007, cream=0.18),
                Ring(z=0.18, y=-0.046, rx=0.004, ry=0.004, cream=0.16),
            ],
            root,
            mats["keratin"],
            segs=8,
        )
    else:
        make_loft(
            f"{name}_pad",
            [
                Ring(z=0.0, y=0.0, rx=0.065, ry=0.065, cream=0.2, power=2.4),
                Ring(z=0.035, y=0.0, rx=0.095, ry=0.092, cream=0.15, power=2.5),
                Ring(z=0.07, y=0.0, rx=0.07, ry=0.068, cream=0.12, power=2.4),
                Ring(z=0.09, y=0.0, rx=0.03, ry=0.03, cream=0.1, power=2.2),
            ],
            root,
            mats["wet"],
            segs=12,
        )


def build_eyes(name: str, mats: dict[str, bpy.types.Material], kind: str) -> None:
    root = make_empty(name)
    if kind == "beads":
        make_loft(
            f"{name}_globe",
            [
                Ring(z=-0.018, y=0.0, rx=0.04, ry=0.036, power=2.4),
                Ring(z=0.0, y=0.0, rx=0.052, ry=0.046, power=2.5),
                Ring(z=0.028, y=0.0, rx=0.042, ry=0.038, power=2.4),
                Ring(z=0.05, y=0.0, rx=0.016, ry=0.015, power=2.2),
            ],
            root,
            mats["eye"],
            segs=12,
        )
        pupil = make_loft(
            f"{name}_pupil",
            [
                Ring(z=0.028, y=0.0, rx=0.02, ry=0.022, power=2.3),
                Ring(z=0.042, y=0.0, rx=0.016, ry=0.018),
                Ring(z=0.052, y=0.0, rx=0.008, ry=0.009),
            ],
            root,
            mats["pupil"],
            segs=8,
        )
        set_creature_location(pupil, 0.0, 0.0, 0.0)
    elif kind == "stalks":
        make_loft(
            f"{name}_stalk",
            [
                Ring(z=0.0, y=0.0, rx=0.03, ry=0.03, power=2.4, cream=0.1),
                Ring(z=0.016, y=0.11, rx=0.026, ry=0.026, power=2.3),
                Ring(z=0.028, y=0.22, rx=0.028, ry=0.028, power=2.4),
            ],
            root,
            mats["skin"],
            segs=8,
        )
        globe = make_loft(
            f"{name}_globe",
            [
                Ring(z=-0.02, y=0.0, rx=0.062, ry=0.058, power=2.45),
                Ring(z=0.0, y=0.0, rx=0.082, ry=0.076, power=2.5),
                Ring(z=0.042, y=0.0, rx=0.05, ry=0.048, power=2.35),
            ],
            root,
            mats["eye"],
            segs=12,
        )
        set_creature_location(globe, 0.0, 0.28, 0.04)
        pupil = make_loft(
            f"{name}_pupil",
            [
                Ring(z=0.0, y=0.0, rx=0.028, ry=0.03),
                Ring(z=0.022, y=0.0, rx=0.02, ry=0.022),
            ],
            root,
            mats["pupil"],
            segs=8,
        )
        set_creature_location(pupil, 0.0, 0.28, 0.08)
    else:
        lid = make_loft(
            f"{name}_lid",
            [
                Ring(z=-0.03, y=0.0, rx=0.09, ry=0.07, cream=0.35, power=2.5),
                Ring(z=0.0, y=0.0, rx=0.11, ry=0.085, cream=0.28, power=2.55),
                Ring(z=0.03, y=0.0, rx=0.08, ry=0.06, cream=0.22, power=2.4),
            ],
            root,
            mats["cream"],
            segs=12,
        )
        set_creature_location(lid, 0.0, 0.0, -0.01)
        make_loft(
            f"{name}_globe",
            [
                Ring(z=-0.018, y=0.0, rx=0.078, ry=0.068, power=2.45),
                Ring(z=0.0, y=0.0, rx=0.098, ry=0.082, power=2.5),
                Ring(z=0.04, y=0.0, rx=0.068, ry=0.058, power=2.35),
            ],
            root,
            mats["eye"],
            segs=12,
        )
        pupil = make_loft(
            f"{name}_pupil",
            [
                Ring(z=0.028, y=0.0, rx=0.038, ry=0.042, power=2.3),
                Ring(z=0.05, y=0.0, rx=0.026, ry=0.028),
            ],
            root,
            mats["pupil"],
            segs=8,
        )
        set_creature_location(pupil, 0.0, 0.0, 0.018)


def build_arms(name: str, mats: dict[str, bpy.types.Material], kind: str) -> None:
    root = make_empty(name)
    if kind == "none":
        make_loft(
            f"{name}_nub",
            [
                Ring(z=0.0, y=0.0, rx=0.042, ry=0.042, power=2.4, cream=0.15),
                Ring(z=0.016, y=-0.09, rx=0.04, ry=0.04, power=2.35, cream=0.28),
                Ring(z=0.028, y=-0.18, rx=0.044, ry=0.04, cream=0.45, power=2.4),
                Ring(z=0.03, y=-0.22, rx=0.028, ry=0.026, cream=0.5),
            ],
            root,
            mats["cream"],
            segs=8,
        )
    elif kind == "grabbers":
        make_loft(
            f"{name}_arm",
            [
                Ring(z=0.0, y=0.0, rx=0.052, ry=0.05, power=2.4),
                Ring(z=0.016, y=-0.10, rx=0.046, ry=0.044, power=2.35),
                Ring(z=0.024, y=-0.20, rx=0.04, ry=0.038, power=2.3),
                Ring(z=0.032, y=-0.28, rx=0.048, ry=0.036, cream=0.28, power=2.4),
                Ring(z=0.04, y=-0.34, rx=0.055, ry=0.032, cream=0.42, power=2.35),
            ],
            root,
            mats["skin"],
            segs=10,
        )
        for i, ox in enumerate((-0.028, 0.028)):
            claw = make_toe(f"{name}_claw_{i}", root, mats["claw"], length=0.075)
            set_creature_location(claw, ox, -0.38, 0.028)
    else:
        make_loft(
            f"{name}_fin",
            [
                Ring(z=-0.04, y=0.0, rx=0.018, ry=0.075, power=2.3, cream=0.1),
                Ring(z=0.0, y=0.0, rx=0.032, ry=0.15, power=2.4, cream=0.12),
                Ring(z=0.08, y=0.0, rx=0.026, ry=0.125, power=2.35),
                Ring(z=0.16, y=0.0, rx=0.012, ry=0.055, power=2.2),
            ],
            root,
            mats["skin"],
            segs=8,
        )


def build_tail(name: str, mats: dict[str, bpy.types.Material], kind: str, length: float) -> None:
    root = make_empty(name)
    extra = 0.22 if kind == "whip" else 0.0
    total = length + extra
    rings = [
        Ring(z=0.0, y=0.0, rx=0.13, ry=0.13, power=2.4, peak=0.1, flat=0.22, cream=0.06),
        Ring(z=-total * 0.18, y=-0.015, rx=0.11, ry=0.11, power=2.35, peak=0.08, flat=0.2),
        Ring(z=-total * 0.38, y=-0.03, rx=0.085, ry=0.085, power=2.3, peak=0.06, flat=0.18, cream=0.08),
        Ring(z=-total * 0.58, y=-0.055, rx=0.06, ry=0.06, power=2.25, cream=0.1),
        Ring(z=-total * 0.78, y=-0.08, rx=0.038, ry=0.038, power=2.2, cream=0.12),
        Ring(z=-total * 0.94, y=-0.105, rx=0.02, ry=0.02, power=2.15),
        Ring(z=-total, y=-0.12, rx=0.01, ry=0.01, power=2.1),
    ]
    make_loft(f"{name}_body", rings, root, mats["skin"], segs=12, levels=0, scales=0.0022)

    if kind != "fan":
        for i, t in enumerate((0.16, 0.34, 0.52, 0.68, 0.84)):
            nub = make_osteoderm(
                f"{name}_ost_{i}",
                root,
                mats["plate"],
                rx=0.034 * (1 - t * 0.32),
                ry=0.022,
                rz=0.028,
            )
            set_creature_location(nub, 0.0, 0.07 - t * 0.08, -total * t)

    if kind == "club":
        club = make_loft(
            f"{name}_club",
            [
                Ring(z=-0.05, y=0.0, rx=0.075, ry=0.075, cream=0.3, power=2.4),
                Ring(z=0.0, y=0.0, rx=0.155, ry=0.14, cream=0.42, power=2.5, peak=0.1),
                Ring(z=0.09, y=0.0, rx=0.1, ry=0.095, cream=0.4, power=2.4),
                Ring(z=0.14, y=0.0, rx=0.05, ry=0.048, cream=0.35),
            ],
            root,
            mats["plate"],
            segs=12,
        )
        set_creature_location(club, 0.0, -0.12, -total)
    elif kind == "fan":
        for i, x in enumerate((-0.16, -0.08, 0.0, 0.08, 0.16)):
            vane = make_kite_plate(f"{name}_vane_{i}", root, mats["plate"], height=0.24, width=0.085, thick=0.018)
            set_creature_location(vane, x, 0.02, -total * 0.9)
            set_creature_rotation(vane, 1.15, 0.0, x * 0.8)
    elif kind == "none":
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
                Ring(z=-0.02, y=0.0, rx=0.22, ry=0.16, cream=0.42, power=2.5, peak=0.08),
                Ring(z=0.0, y=0.045, rx=0.34, ry=0.23, cream=0.52, power=2.55, peak=0.12),
                Ring(z=0.045, y=0.09, rx=0.28, ry=0.2, cream=0.5, power=2.45),
            ],
            root,
            mats["plate"],
            segs=14,
        )
        for i, x in enumerate((-0.16, 0.0, 0.16)):
            place_shell(root, mats, f"{name}_shell_{i}", x, 0.14, -0.04, 0.65, (-0.3, 0.0, 0.0))
    else:
        for side, sx in (("L", 1.0), ("R", -1.0)):
            stalk = make_loft(
                f"{name}_stalk_{side}",
                [
                    Ring(z=0.0, y=0.0, rx=0.015, ry=0.015, cream=0.4, power=2.3),
                    Ring(z=0.01, y=0.14, rx=0.012, ry=0.012, cream=0.4),
                    Ring(z=0.02, y=0.24, rx=0.012, ry=0.012, cream=0.4),
                ],
                root,
                mats["plate"],
                segs=6,
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
        export_animations=False,  # runtime uses src/lib/game/anim.ts (procedural)
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


def _show_tree(root: bpy.types.Object, visible: bool) -> None:
    root.hide_render = not visible
    root.hide_viewport = not visible
    for child in root.children_recursive:
        child.hide_render = not visible
        child.hide_viewport = not visible


def _dup_tree(src: bpy.types.Object, suffix: str) -> bpy.types.Object:
    copy = src.copy()
    copy.name = f"{src.name}{suffix}"
    collection().objects.link(copy)
    for child in src.children:
        child_copy = _dup_tree(child, suffix)
        child_copy.parent = copy
        child_copy.matrix_parent_inverse = child.matrix_parent_inverse.copy()
    return copy


def _gpu_preview_ok() -> bool:
    return bool(find_library("EGL") or find_library("GL"))


def render_starter_previews(out_dir: Path, sockets: dict[str, SocketSet], drops: dict[str, float]) -> None:
    """EEVEE 3/4 shots of the three locked starters (for PR / art review)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 800
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.72, 0.78, 0.76, 1.0)
        bg.inputs[1].default_value = 0.85

    cam_data = bpy.data.cameras.new("preview_cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("preview_cam", cam_data)
    collection().objects.link(cam)
    scene.camera = cam

    sun_data = bpy.data.lights.new("preview_sun", "SUN")
    sun_data.energy = 3.2
    sun_data.color = (1.0, 0.92, 0.78)
    sun_data.angle = 0.18
    sun = bpy.data.objects.new("preview_sun", sun_data)
    sun.rotation_euler = Euler((0.85, 0.15, 0.7), "XYZ")
    collection().objects.link(sun)

    fill_data = bpy.data.lights.new("preview_fill", "SUN")
    fill_data.energy = 0.7
    fill_data.color = (0.72, 0.82, 0.88)
    fill = bpy.data.objects.new("preview_fill", fill_data)
    fill.rotation_euler = Euler((0.4, -0.8, -0.4), "XYZ")
    collection().objects.link(fill)

    starters = (
        ("theropod", "sleek", "stilts", "maw", "beads"),
        ("sauropod", "plump", "stubby", "beak", "beads"),
        ("stego", "spiky", "stubby", "beak", "beads"),
    )

    for label, body, legs, mouth, eyes in starters:
        for obj in list(bpy.data.objects):
            if obj.name.startswith("preview_"):
                continue
            obj.hide_render = True
            obj.hide_viewport = True

        chassis = bpy.data.objects[f"chassis_{body}"]
        plan = sockets[body]
        hip_y = drops[legs]
        _show_tree(chassis, True)
        set_creature_location(chassis, 0.0, hip_y, 0.0)
        chassis.rotation_mode = "XYZ"
        set_creature_rotation(chassis, plan.pitch, 0.0, 0.0)

        mouth_obj = bpy.data.objects[f"mouth_{mouth}"]
        _show_tree(mouth_obj, True)
        mouth_obj.parent = chassis
        set_creature_location(mouth_obj, *plan.jaw)

        for sx, side in ((1.0, "L"), (-1.0, "R")):
            src_eye = bpy.data.objects[f"eyes_{eyes}"]
            eye = src_eye if sx > 0 else _dup_tree(src_eye, f"_{label}_{side}")
            _show_tree(eye, True)
            eye.parent = chassis
            set_creature_location(eye, plan.eye[0] * sx, plan.eye[1], plan.eye[2])
            eye.scale = (sx, 1.0, 1.0)

        tail = bpy.data.objects["tail_none"]
        _show_tree(tail, True)
        tail.parent = chassis
        set_creature_location(tail, *plan.tail_root[0])
        set_creature_rotation(tail, *plan.tail_root[1])

        if plan.stance == "biped":
            slots = [(plan.hip[0], plan.hip[1], False), (-plan.hip[0], plan.hip[1], False)]
        else:
            slots = [
                (plan.shoulder[0], plan.shoulder[1], True),
                (-plan.shoulder[0], plan.shoulder[1], True),
                (plan.hip[0], plan.hip[1], False),
                (-plan.hip[0], plan.hip[1], False),
            ]
        src_leg = bpy.data.objects[f"legs_{legs}"]
        for i, (x, z, fore) in enumerate(slots):
            leg = src_leg if i == 0 else _dup_tree(src_leg, f"_{label}_{i}")
            _show_tree(leg, True)
            leg.parent = None
            set_creature_location(leg, x, hip_y, z)
            sx = -1.0 if x < 0 else 1.0
            sy = 0.9 if fore else 1.0
            sz = 0.92 if fore else 1.0
            leg.scale = (sx, sy, sz)

        length = 2.4 if body == "plump" else 1.85
        cam.location = creature_to_blender(length * 0.9, hip_y + 0.9, length * 1.2)
        target = creature_to_blender(0.0, hip_y + 0.48, 0.28 if body != "plump" else 0.6)
        direction = target - cam.location
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

        scene.render.filepath = str(out_dir / f"starter_{label}.png")
        bpy.ops.render.render(write_still=True)
        print(f"Wrote preview {scene.render.filepath}")

        mouth_obj.parent = None
        tail.parent = None


def main() -> None:
    out, preview = parse_args()
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

    stats = {
        "chassis_sleek": subtree_tris(bpy.data.objects["chassis_sleek"]),
        "chassis_plump": subtree_tris(bpy.data.objects["chassis_plump"]),
        "chassis_spiky": subtree_tris(bpy.data.objects["chassis_spiky"]),
        "legs_stilts": subtree_tris(bpy.data.objects["legs_stilts"]),
        "legs_stubby": subtree_tris(bpy.data.objects["legs_stubby"]),
        "mouth_maw": subtree_tris(bpy.data.objects["mouth_maw"]),
        "total": sum(mesh_tris(o) for o in bpy.data.objects),
    }

    export_glb(out)
    write_sockets_ts(SOCKETS_TS, sockets, drops)
    if preview is not None:
        if _gpu_preview_ok():
            render_starter_previews(preview, sockets, drops)
        else:
            print(json.dumps({"preview_skipped": "no EGL/GL library (headless)"}))
    size = out.stat().st_size if out.exists() else 0
    print(json.dumps({"out": str(out), "bytes": size, "objects": len(bpy.data.objects), "tris": stats}))


if __name__ == "__main__":
    main()
