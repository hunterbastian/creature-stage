"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { InstancedMesh, Object3D } from "three";
import { assertNever } from "@/lib/game/types";
import {
  seedWorldDress,
  type LandformSpec,
  type PropPose,
  type TidePoolSpec,
} from "@/lib/game/world-dress";

const dummy = new Object3D();

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
      dummy.position.set(item.x, item.y, item.z);
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

function TidePool({ pool }: { pool: TidePoolSpec }) {
  return (
    <group position={[pool.x, 0, pool.z]} rotation={[0, pool.yaw, 0]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.008, 0]}
        scale={[pool.sx * 1.16, pool.sz * 1.16, 1]}
        receiveShadow
      >
        <ringGeometry args={[0.5, 0.74, 16]} />
        <meshPhongMaterial color="#6e6a58" shininess={16} specular="#b0a890" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0]}
        scale={[pool.sx, pool.sz, 1]}
        receiveShadow
      >
        <circleGeometry args={[0.55, 16]} />
        <meshPhongMaterial color="#2f565e" shininess={58} specular="#c8ece8" />
      </mesh>
    </group>
  );
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, z]} receiveShadow>
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
            <dodecahedronGeometry args={[1.1, 0]} />
            <meshPhongMaterial color="#8a8478" shininess={5} specular="#b0aaa0" />
          </mesh>
          <mesh
            position={[scale * 0.55, scale * 0.34, -scale * 0.2]}
            scale={[scale * 0.55, scale * 0.72, scale * 0.45]}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshPhongMaterial color="#7a7468" shininess={4} specular="#a8a298" />
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
            <dodecahedronGeometry args={[1.05, 0]} />
            <meshPhongMaterial color="#8e887c" shininess={5} specular="#b4aea4" />
          </mesh>
          <mesh
            position={[scale * 0.48, scale * 0.22, -scale * 0.16]}
            scale={[scale * 0.42, scale * 0.5, scale * 0.36]}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshPhongMaterial color="#7c766c" shininess={4} specular="#a8a298" />
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
            <dodecahedronGeometry args={[1, 0]} />
            <meshPhongMaterial color="#7a766c" shininess={8} specular="#b0aaa0" />
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

  return (
    <>
      {dress.clearings.map((clearing) => (
        <NestClearing key={`${clearing.x}-${clearing.z}`} {...clearing} />
      ))}
      {dress.tidePools.map((pool) => (
        <TidePool key={`${pool.x}-${pool.z}`} pool={pool} />
      ))}

      <InstancedField poses={dress.grass}>
        <coneGeometry args={[1, 1, 5]} />
        <meshPhongMaterial color="#627c3c" shininess={4} specular="#8a9c64" />
      </InstancedField>
      <InstancedField poses={dress.reeds}>
        <coneGeometry args={[1, 1, 5]} />
        <meshPhongMaterial color="#5a6a44" shininess={5} specular="#8a9870" />
      </InstancedField>
      <InstancedField poses={dress.dryRocks} castShadow={shade} receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#746e64" shininess={6} specular="#9a9488" />
      </InstancedField>
      <InstancedField poses={dress.wetRocks} castShadow={shade} receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#5c625c" shininess={22} specular="#b8c4bc" />
      </InstancedField>
      <InstancedField poses={dress.shells}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshPhongMaterial color="#d4c8b4" shininess={18} specular="#efe4d4" />
      </InstancedField>
      <InstancedField poses={dress.kelp}>
        <coneGeometry args={[1, 1, 5]} />
        <meshPhongMaterial color="#3d5240" shininess={8} specular="#7a8c70" />
      </InstancedField>
      <InstancedField poses={dress.driftwood} castShadow={shade} receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 5]} />
        <meshPhongMaterial color="#8a7a64" shininess={7} specular="#c4b49a" />
      </InstancedField>
      <InstancedField poses={dress.trunks} castShadow={shade}>
        <cylinderGeometry args={[1, 1.2, 1, 5]} />
        <meshPhongMaterial color="#6a5a44" shininess={6} specular="#a09078" />
      </InstancedField>
      <InstancedField poses={dress.crowns} castShadow={shade}>
        <icosahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#4c5a38" shininess={8} specular="#a8b090" />
      </InstancedField>
      <InstancedField poses={dress.canopies} castShadow={shade}>
        <coneGeometry args={[1, 1, 6]} />
        <meshPhongMaterial color="#556644" shininess={8} specular="#b0b894" />
      </InstancedField>
      <InstancedField poses={dress.scrub}>
        <icosahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#5a6248" shininess={6} specular="#9aaa78" />
      </InstancedField>

      {dress.landforms.map((spec) => (
        <Landform key={`${spec.kind}-${spec.x}-${spec.z}`} spec={spec} />
      ))}
    </>
  );
}
