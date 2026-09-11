"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, MeshBasicMaterial } from "three";
import { isCoarsePointer } from "@/lib/game/device";
import {
  offshorePose,
  offshoreRoster,
  type OffshoreKind,
  type OffshoreSpec,
} from "@/lib/game/offshore";
import { assertNever } from "@/lib/game/types";

const INK = "#3d6c74";
const INK_DEEP = "#335860";
const SEAFOAM = "#5a8a86";
const SEAFOAM_LIFT = "#7aa8a2";
const BONE = "#e4d8c4";

const SERPENT_SPINE = [
  { z: 6.2, r: 0.56, sx: 1.08, sy: 0.8, sz: 1.32 },
  { z: 4.45, r: 0.6, sx: 1.12, sy: 0.84, sz: 1.28 },
  { z: 2.7, r: 0.55, sx: 1.06, sy: 0.78, sz: 1.24 },
  { z: 1.0, r: 0.48, sx: 1.0, sy: 0.72, sz: 1.18 },
  { z: -0.65, r: 0.4, sx: 0.94, sy: 0.66, sz: 1.12 },
  { z: -2.2, r: 0.32, sx: 0.88, sy: 0.58, sz: 1.06 },
  { z: -3.65, r: 0.24, sx: 0.8, sy: 0.48, sz: 1.0 },
] as const;

function InkSkin({
  color,
  emissive = color,
      glow = 0.12,
  shininess = 26,
}: {
  color: string;
  emissive?: string;
  glow?: number;
  shininess?: number;
}) {
  return (
    <meshPhongMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={glow}
      shininess={shininess}
      specular="#b8d4d0"
    />
  );
}

function BoneAccent() {
  return (
    <meshPhongMaterial
      color={BONE}
      emissive="#c8b898"
      emissiveIntensity={0.035}
      shininess={18}
      specular="#f2eadc"
    />
  );
}

function SerpentSilhouette({ detail }: { detail: number }) {
  const spine = useRef<Group>(null);

  useFrame(({ clock }) => {
    const root = spine.current;
    if (!root) return;
    const t = clock.elapsedTime;
    root.children.forEach((node, index) => {
      const wave = Math.sin(t * 0.48 - index * 0.58);
      node.position.x = wave * 0.32;
      node.position.y = Math.abs(Math.sin(t * 0.36 - index * 0.5)) * 0.55;
      node.rotation.y = wave * 0.16;
    });
  });

  return (
    <group>
      <group position={[0, 0.55, 7.55]}>
        <mesh scale={[1.18, 0.78, 1.48]}>
          <sphereGeometry args={[0.7, detail, detail - 2]} />
          <InkSkin color={INK} emissive={SEAFOAM} glow={0.09} />
        </mesh>
        <mesh position={[0, -0.22, 0.42]} scale={[0.92, 0.42, 1.05]}>
          <sphereGeometry args={[0.42, detail, 6]} />
          <InkSkin color={INK_DEEP} glow={0.05} />
        </mesh>
        <mesh position={[0.28, 0.18, 0.32]} scale={[0.22, 0.18, 0.2]}>
          <sphereGeometry args={[0.22, 6, 5]} />
          <BoneAccent />
        </mesh>
        <mesh position={[-0.28, 0.18, 0.32]} scale={[0.22, 0.18, 0.2]}>
          <sphereGeometry args={[0.22, 6, 5]} />
          <BoneAccent />
        </mesh>
        <mesh
          position={[0.08, 0.38, -0.08]}
          rotation={[1.15, 0.2, 0.15]}
          scale={[0.22, 0.22, 0.09]}
        >
          <torusGeometry args={[1, 0.38, 6, 8]} />
          <BoneAccent />
        </mesh>
        <mesh position={[0, 0.52, -0.15]} rotation={[0.15, 0, 0]} scale={[0.12, 0.42, 0.28]}>
          <coneGeometry args={[1, 1, 6]} />
          <InkSkin color={SEAFOAM} glow={0.1} />
        </mesh>
      </group>

      <group ref={spine}>
        {SERPENT_SPINE.map((joint, index) => (
          <group key={joint.z} position={[0, 0, joint.z]}>
            <mesh scale={[joint.sx, joint.sy, joint.sz]}>
              <sphereGeometry args={[joint.r, detail, detail - 2]} />
              <InkSkin
                color={index % 2 === 0 ? INK : INK_DEEP}
                emissive={SEAFOAM}
                glow={0.07}
              />
            </mesh>
            {index % 2 === 0 ? (
              <mesh
                position={[0, joint.r * joint.sy + 0.18, 0]}
                rotation={[0.08, 0, 0]}
                scale={[0.08, 0.34 + (6 - index) * 0.04, 0.22]}
              >
                <coneGeometry args={[1, 1, 5]} />
                <InkSkin color={SEAFOAM} glow={0.1} />
              </mesh>
            ) : null}
          </group>
        ))}
      </group>

      <mesh position={[0, -0.02, -4.85]} rotation={[0.15, 0, 0]} scale={[0.16, 0.18, 0.85]}>
        <coneGeometry args={[1, 1, 6]} />
        <InkSkin color={INK_DEEP} glow={0.06} />
      </mesh>
    </group>
  );
}

function RaySilhouette({ detail }: { detail: number }) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);

  useFrame(({ clock }) => {
    const flap = Math.sin(clock.elapsedTime * 0.52) * 0.14;
    if (left.current) left.current.rotation.z = 0.08 + flap;
    if (right.current) right.current.rotation.z = -0.08 - flap;
  });

  return (
    <group>
      <mesh position={[0, 0.28, 0]} scale={[2.15, 0.48, 1.85]}>
        <sphereGeometry args={[1, detail, detail - 2]} />
        <InkSkin color={INK} emissive={SEAFOAM} glow={0.08} />
      </mesh>
      <mesh position={[0, -0.12, 0.05]} scale={[1.72, 0.16, 1.42]}>
        <sphereGeometry args={[1, detail, 6]} />
        <meshPhongMaterial
          color="#d8ccb4"
          emissive="#c4b49a"
          emissiveIntensity={0.03}
          shininess={22}
          specular="#f0e8d8"
        />
      </mesh>
      <mesh position={[0, 0.12, 0.85]} scale={[0.72, 0.22, 0.7]}>
        <sphereGeometry args={[0.7, detail, 6]} />
        <InkSkin color={INK_DEEP} glow={0.06} />
      </mesh>
      <mesh
        position={[0.18, 0.28, 0.12]}
        rotation={[1.1, 0.35, 0.1]}
        scale={[0.2, 0.2, 0.08]}
      >
        <torusGeometry args={[1, 0.36, 5, 8]} />
        <BoneAccent />
      </mesh>

      <group ref={left} position={[-1.15, 0.22, -0.15]}>
        <mesh position={[-1.55, 0, 0]} scale={[2.05, 0.13, 1.28]}>
          <sphereGeometry args={[1, detail, 6]} />
          <InkSkin color={SEAFOAM} emissive={SEAFOAM_LIFT} glow={0.07} />
        </mesh>
        <mesh position={[-2.55, 0.02, -0.35]} scale={[0.85, 0.08, 0.55]}>
          <sphereGeometry args={[1, 7, 5]} />
          <InkSkin color={INK_DEEP} glow={0.05} />
        </mesh>
      </group>
      <group ref={right} position={[1.15, 0.22, -0.15]}>
        <mesh position={[1.55, 0, 0]} scale={[2.05, 0.13, 1.28]}>
          <sphereGeometry args={[1, detail, 6]} />
          <InkSkin color={SEAFOAM} emissive={SEAFOAM_LIFT} glow={0.07} />
        </mesh>
        <mesh position={[2.55, 0.02, -0.35]} scale={[0.85, 0.08, 0.55]}>
          <sphereGeometry args={[1, 7, 5]} />
          <InkSkin color={INK_DEEP} glow={0.05} />
        </mesh>
      </group>

      <mesh position={[0.62, 0.04, 1.55]} rotation={[0.2, 0.35, 0.1]} scale={[0.18, 0.08, 0.55]}>
        <sphereGeometry args={[1, 6, 5]} />
        <InkSkin color={INK} glow={0.06} />
      </mesh>
      <mesh position={[-0.62, 0.04, 1.55]} rotation={[0.2, -0.35, -0.1]} scale={[0.18, 0.08, 0.55]}>
        <sphereGeometry args={[1, 6, 5]} />
        <InkSkin color={INK} glow={0.06} />
      </mesh>
      <mesh position={[0, -0.02, -2.35]} rotation={[0.2, 0, 0]} scale={[0.14, 0.1, 1.35]}>
        <capsuleGeometry args={[1, 1, 3, 6]} />
        <InkSkin color={INK_DEEP} glow={0.05} />
      </mesh>
    </group>
  );
}

function LeviathanSilhouette({ detail }: { detail: number }) {
  const fins = useRef<Group>(null);

  useFrame(({ clock }) => {
    const sway = Math.sin(clock.elapsedTime * 0.4) * 0.1;
    if (fins.current) fins.current.rotation.y = sway;
  });

  return (
    <group>
      <mesh scale={[1.28, 0.92, 3.05]}>
        <sphereGeometry args={[1, detail, detail - 2]} />
        <InkSkin color={INK_DEEP} emissive={SEAFOAM} glow={0.075} />
      </mesh>
      <mesh position={[0, 0.08, 2.85]} scale={[0.82, 0.68, 1.12]}>
        <sphereGeometry args={[0.78, detail, 7]} />
        <InkSkin color={INK} glow={0.07} />
      </mesh>
      <mesh position={[0, -0.18, 3.15]} scale={[0.62, 0.28, 0.78]}>
        <sphereGeometry args={[0.55, 7, 5]} />
        <InkSkin color={INK_DEEP} glow={0.05} />
      </mesh>
      <mesh position={[0.26, 0.22, 3.15]} scale={[0.16, 0.14, 0.14]}>
        <sphereGeometry args={[0.2, 6, 5]} />
        <BoneAccent />
      </mesh>
      <mesh position={[-0.26, 0.22, 3.15]} scale={[0.16, 0.14, 0.14]}>
        <sphereGeometry args={[0.2, 6, 5]} />
        <BoneAccent />
      </mesh>

        <mesh
        position={[0, 1.55, 0.15]}
        rotation={[0.12, 0, 0]}
        scale={[0.12, 1.85, 1.7]}
      >
        <coneGeometry args={[1, 1, 6]} />
        <InkSkin color={SEAFOAM} emissive={SEAFOAM_LIFT} glow={0.11} />
      </mesh>
      <mesh
        position={[0.12, 0.72, -0.35]}
        rotation={[1.05, 0.4, 0.2]}
        scale={[0.22, 0.22, 0.08]}
      >
        <torusGeometry args={[1, 0.36, 5, 8]} />
        <BoneAccent />
      </mesh>

      {[1.35, 0.15, -1.15].map((z, index) => (
        <mesh
          key={`plate-${z}`}
          position={[0, 0.72 - index * 0.06, z]}
          scale={[0.22, 0.14, 0.2]}
        >
          <sphereGeometry args={[0.28, 6, 5]} />
          <BoneAccent />
        </mesh>
      ))}

      <group ref={fins}>
        <mesh position={[1.15, -0.12, 1.05]} rotation={[0.15, 0, -0.45]} scale={[1.15, 0.1, 0.48]}>
          <sphereGeometry args={[1, 7, 5]} />
          <InkSkin color={SEAFOAM} glow={0.08} />
        </mesh>
        <mesh position={[-1.15, -0.12, 1.05]} rotation={[0.15, 0, 0.45]} scale={[1.15, 0.1, 0.48]}>
          <sphereGeometry args={[1, 7, 5]} />
          <InkSkin color={SEAFOAM} glow={0.08} />
        </mesh>
        <mesh position={[0.95, -0.18, -0.35]} rotation={[0.1, 0, -0.38]} scale={[0.72, 0.08, 0.32]}>
          <sphereGeometry args={[1, 6, 5]} />
          <InkSkin color={INK} glow={0.06} />
        </mesh>
        <mesh position={[-0.95, -0.18, -0.35]} rotation={[0.1, 0, 0.38]} scale={[0.72, 0.08, 0.32]}>
          <sphereGeometry args={[1, 6, 5]} />
          <InkSkin color={INK} glow={0.06} />
        </mesh>
        <mesh position={[0.72, 0.05, -1.85]} rotation={[0.05, 0, -0.32]} scale={[0.55, 0.07, 0.28]}>
          <sphereGeometry args={[1, 6, 5]} />
          <InkSkin color={SEAFOAM} glow={0.07} />
        </mesh>
        <mesh position={[-0.72, 0.05, -1.85]} rotation={[0.05, 0, 0.32]} scale={[0.55, 0.07, 0.28]}>
          <sphereGeometry args={[1, 6, 5]} />
          <InkSkin color={SEAFOAM} glow={0.07} />
        </mesh>
      </group>

      <mesh position={[0, 0.02, -3.15]} scale={[0.42, 0.38, 0.85]}>
        <sphereGeometry args={[0.7, detail, 6]} />
        <InkSkin color={INK} glow={0.06} />
      </mesh>
      <mesh position={[0.55, 0.04, -3.85]} rotation={[0, 0, 0.15]} scale={[0.85, 0.08, 0.42]}>
        <sphereGeometry args={[1, 7, 5]} />
        <InkSkin color={SEAFOAM} glow={0.08} />
      </mesh>
      <mesh position={[-0.55, 0.04, -3.85]} rotation={[0, 0, -0.15]} scale={[0.85, 0.08, 0.42]}>
        <sphereGeometry args={[1, 7, 5]} />
        <InkSkin color={SEAFOAM} glow={0.08} />
      </mesh>
    </group>
  );
}

function BeastBody({ kind, detail }: { kind: OffshoreKind; detail: number }) {
  switch (kind) {
    case "serpent":
      return <SerpentSilhouette detail={detail} />;
    case "ray":
      return <RaySilhouette detail={detail} />;
    case "leviathan":
      return <LeviathanSilhouette detail={detail} />;
    default:
      return assertNever(kind, "Unknown offshore kind");
  }
}

function wakeSpread(kind: OffshoreKind): { back: number; width: number } {
  switch (kind) {
    case "ray":
      return { back: 2.4, width: 3.4 };
    case "serpent":
      return { back: 3.6, width: 2.2 };
    case "leviathan":
      return { back: 3.1, width: 2.8 };
    default:
      return assertNever(kind, "Unknown offshore kind");
  }
}

function WakeHint({ spec }: { spec: OffshoreSpec }) {
  const wake = useRef<Group>(null);
  const foam = useRef<MeshBasicMaterial>(null);
  const spread = wakeSpread(spec.kind);

  useFrame(({ clock }) => {
    if (!wake.current) return;
    const pose = offshorePose(spec, clock.elapsedTime);
    wake.current.position.set(
      pose.x - Math.sin(pose.yaw) * spread.back,
      -0.168,
      pose.z - Math.cos(pose.yaw) * spread.back,
    );
    wake.current.rotation.y = pose.yaw;
    if (foam.current) {
      foam.current.opacity =
        0.1 + Math.sin(clock.elapsedTime * 0.7 + spec.phase) * 0.025;
    }
  });

  return (
    <group ref={wake}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[spread.width, spread.width * 0.42, 1]}
        renderOrder={-1}
      >
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial
          ref={foam}
          color="#d4ece8"
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function OffshoreBeast({
  spec,
  detail,
  wake,
}: {
  spec: OffshoreSpec;
  detail: number;
  wake: boolean;
}) {
  const root = useRef<Group>(null);
  const start = offshorePose(spec, 0);

  useFrame(({ clock }) => {
    if (!root.current) return;
    const pose = offshorePose(spec, clock.elapsedTime);
    root.current.position.set(pose.x, pose.y, pose.z);
    root.current.rotation.set(pose.pitch, pose.yaw, 0);
  });

  return (
    <>
      <group
        ref={root}
        scale={spec.scale}
        position={[start.x, start.y, start.z]}
        rotation={[start.pitch, start.yaw, 0]}
        userData={{ tideformOffshore: spec.id }}
      >
        <BeastBody kind={spec.kind} detail={detail} />
      </group>
      {wake ? <WakeHint spec={spec} /> : null}
    </>
  );
}

export function OffshoreFauna() {
  const coarse = useMemo(() => isCoarsePointer(), []);
  const roster = useMemo(() => offshoreRoster(coarse), [coarse]);
  const detail = coarse ? 7 : 10;

  return (
    <group>
      {roster.map((spec) => (
        <OffshoreBeast
          key={spec.id}
          spec={spec}
          detail={detail}
          wake={!coarse}
        />
      ))}
    </group>
  );
}
