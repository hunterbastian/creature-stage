"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { InstancedMesh, Object3D } from "three";
import { assertNever } from "@/lib/game/types";
import {
  sampleGroundY,
  seedWorldDress,
  type HazeSpec,
  type LandformSpec,
  type PropPose,
  type TidePoolSpec,
} from "@/lib/game/worldgen";

const dummy = new Object3D();

function propY(item: PropPose): number {
  return item.y + sampleGroundY(item.x, item.z);
}

function InstancedField({
  poses,
  castShadow = false,
  receiveShadow = false,
  children,
}: {
  poses: PropPose[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  children: ReactNode;
}) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    poses.forEach((item, index) => {
      dummy.rotation.order = "XYZ";
      dummy.position.set(item.x, propY(item), item.z);
      dummy.rotation.set(item.rx, item.ry, item.rz);
      dummy.scale.set(item.sx, item.sy, item.sz);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
  }, [poses]);

  if (!poses || poses.length === 0) return null;

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, poses.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {children}
    </instancedMesh>
  );
}

/** Ground-plane decals (foam, haze, tide-pool discs). Yaw then flatten. */
function InstancedDecals({
  poses,
  renderOrder,
  receiveShadow = false,
  followGround = true,
  children,
}: {
  poses: PropPose[];
  renderOrder?: number;
  receiveShadow?: boolean;
  followGround?: boolean;
  children: ReactNode;
}) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    poses.forEach((item, index) => {
      dummy.position.set(
        item.x,
        followGround ? propY(item) : item.y,
        item.z,
      );
      dummy.rotation.order = "YXZ";
      dummy.rotation.set(-Math.PI / 2, item.ry, 0);
      dummy.scale.set(item.sx, item.sz, 1);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
  }, [poses, followGround]);

  if (!poses || poses.length === 0) return null;

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, poses.length]}
      renderOrder={renderOrder}
      receiveShadow={receiveShadow}
    >
      {children}
    </instancedMesh>
  );
}

function poolRimPoses(pools: TidePoolSpec[]): PropPose[] {
  return pools.map((pool) => ({
    x: pool.x,
    y: 0.008,
    z: pool.z,
    rx: 0,
    ry: pool.yaw,
    rz: 0,
    sx: pool.sx * 1.16,
    sy: 1,
    sz: pool.sz * 1.16,
  }));
}

function poolWaterPoses(pools: TidePoolSpec[]): PropPose[] {
  return pools.map((pool) => ({
    x: pool.x,
    y: 0.015,
    z: pool.z,
    rx: 0,
    ry: pool.yaw,
    rz: 0,
    sx: pool.sx,
    sy: 1,
    sz: pool.sz,
  }));
}

function hazePoses(haze: HazeSpec[]): PropPose[] {
  return haze.map((item) => ({
    x: item.x,
    y: item.y,
    z: item.z,
    rx: 0,
    ry: 0,
    rz: 0,
    sx: item.radius,
    sy: 1,
    sz: item.radius,
  }));
}

function NestClearing({
  x,
  z,
  radius,
  color,
}: {
  x: number;
  z: number;
  radius: number;
  color: string;
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[x, sampleGroundY(x, z) + 0.006, z]}
      receiveShadow
    >
      <circleGeometry args={[radius, 16]} />
      <meshPhongMaterial color={color} shininess={5} specular="#9aaa70" />
    </mesh>
  );
}

function Landform({ spec }: { spec: LandformSpec }) {
  const { x, z, scale, rot, kind } = spec;

  switch (kind) {
    case "cliff":
      return (
        <group position={[x, 0, z]} rotation={[0, rot, 0]}>
          <mesh
            position={[0, scale * 0.55, 0]}
            scale={[scale, scale * 1.15, scale * 0.72]}
            castShadow
          >
            <dodecahedronGeometry args={[1.1, 1]} />
            <meshPhongMaterial color="#9a9488" shininess={6} specular="#c4b8a8" />
          </mesh>
          <mesh
            position={[scale * 0.55, scale * 0.34, -scale * 0.2]}
            scale={[scale * 0.55, scale * 0.72, scale * 0.45]}
          >
            <dodecahedronGeometry args={[1, 1]} />
            <meshPhongMaterial color="#8e887c" shininess={5} specular="#b8aea0" />
          </mesh>
        </group>
      );
    case "isle":
      return (
        <group position={[x, 0, z]} rotation={[0, rot, 0]}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.06, 0]}
            scale={[scale * 1.55, scale * 1.15, 1]}
          >
            <circleGeometry args={[1.05, 12]} />
            <meshPhongMaterial color="#c4b48a" shininess={8} specular="#d8c9a4" />
          </mesh>
          <mesh
            position={[0, scale * 0.42, 0]}
            scale={[scale * 0.92, scale * 0.88, scale * 0.7]}
          >
            <dodecahedronGeometry args={[1.05, 1]} />
            <meshPhongMaterial color="#9a9488" shininess={6} specular="#c4b8a8" />
          </mesh>
          <mesh
            position={[scale * 0.48, scale * 0.22, -scale * 0.16]}
            scale={[scale * 0.42, scale * 0.5, scale * 0.36]}
          >
            <dodecahedronGeometry args={[1, 1]} />
            <meshPhongMaterial color="#8c867a" shininess={5} specular="#b8aea0" />
          </mesh>
        </group>
      );
    case "stack":
      return (
        <group position={[x, 0, z]} rotation={[0, rot, 0]}>
          <mesh
            position={[0, scale * 0.62, 0]}
            scale={[scale * 0.72, scale * 1.25, scale * 0.58]}
            castShadow
          >
            <dodecahedronGeometry args={[1, 1]} />
            <meshPhongMaterial color="#908a80" shininess={8} specular="#c4b8a8" />
          </mesh>
        </group>
      );
    default:
      return assertNever(kind, "Unknown landform");
  }
}

export function CoastalDress({ coarse }: { coarse: boolean }) {
  const dress = useMemo(() => seedWorldDress(coarse), [coarse]);
  const shade = !coarse;
  const rims = useMemo(() => poolRimPoses(dress.tidePools), [dress.tidePools]);
  const water = useMemo(() => poolWaterPoses(dress.tidePools), [dress.tidePools]);
  const mist = useMemo(() => hazePoses(dress.haze), [dress.haze]);

  return (
    <>
      {dress.clearings.map((clearing) => (
        <NestClearing key={`${clearing.x}-${clearing.z}`} {...clearing} />
      ))}

      <InstancedDecals poses={rims} receiveShadow>
        <ringGeometry args={[0.5, 0.74, 16]} />
        <meshPhongMaterial color="#8a8068" shininess={14} specular="#d4c8a8" />
      </InstancedDecals>
      <InstancedDecals poses={water} receiveShadow>
        <circleGeometry args={[0.55, 16]} />
        <meshPhongMaterial color="#3d6e74" shininess={48} specular="#c8e8e0" />
      </InstancedDecals>

      <InstancedField poses={dress.grass}>
        <coneGeometry args={[1, 1, 6]} />
        <meshPhongMaterial color="#5e7644" shininess={5} specular="#9aaa70" />
      </InstancedField>
      <InstancedField poses={dress.reeds}>
        <coneGeometry args={[1, 1, 6]} />
        <meshPhongMaterial color="#5c6848" shininess={6} specular="#a8b088" />
      </InstancedField>
      <InstancedField poses={dress.dryRocks} castShadow={shade} receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#8a8276" shininess={7} specular="#c4b8a8" />
      </InstancedField>
      <InstancedField poses={dress.wetRocks} castShadow={shade} receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#5e6864" shininess={24} specular="#c8d8d0" />
      </InstancedField>
      <InstancedField poses={dress.shelves} castShadow={shade} receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#7a766c" shininess={10} specular="#c8d0c4" />
      </InstancedField>
      <InstancedField poses={dress.shells}>
        <sphereGeometry args={[1, 7, 6]} />
        <meshPhongMaterial color="#e4d8c4" shininess={20} specular="#f4eee4" />
      </InstancedField>
      <InstancedField poses={dress.spirals}>
        <torusGeometry args={[1, 0.36, 6, 10]} />
        <meshPhongMaterial color="#e8dcc8" shininess={22} specular="#f6f0e6" />
      </InstancedField>
      <InstancedField poses={dress.kelp}>
        <coneGeometry args={[1, 1, 6]} />
        <meshPhongMaterial color="#4a5a44" shininess={8} specular="#8a9c78" />
      </InstancedField>
      <InstancedField poses={dress.driftwood} castShadow={shade} receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshPhongMaterial color="#9a8a70" shininess={8} specular="#d4c4a8" />
      </InstancedField>
      <InstancedField poses={dress.trunks} castShadow={shade}>
        <cylinderGeometry args={[1, 1.18, 1, 6]} />
        <meshPhongMaterial color="#7a6a52" shininess={7} specular="#c4b49a" />
      </InstancedField>
      <InstancedField poses={dress.crowns} castShadow={shade}>
        <icosahedronGeometry args={[1, coarse ? 0 : 1]} />
        <meshPhongMaterial color="#5a6848" shininess={9} specular="#c4d0a8" />
      </InstancedField>
      <InstancedField poses={dress.canopies} castShadow={shade}>
        <coneGeometry args={[1, 1, 7]} />
        <meshPhongMaterial color="#627050" shininess={9} specular="#c8d4b0" />
      </InstancedField>
      <InstancedField poses={dress.scrub}>
        <icosahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#61684c" shininess={7} specular="#b0b888" />
      </InstancedField>

      <InstancedDecals poses={dress.foam} renderOrder={2}>
        <circleGeometry args={[1, 10]} />
        <meshBasicMaterial
          color="#e4eee8"
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </InstancedDecals>
      <InstancedDecals poses={mist} renderOrder={-1} followGround={false}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial
          color="#c8d4cc"
          transparent
          opacity={0.09}
          depthWrite={false}
        />
      </InstancedDecals>

      {dress.landforms.map((spec) => (
        <Landform key={`${spec.kind}-${spec.x}-${spec.z}`} spec={spec} />
      ))}
    </>
  );
}
