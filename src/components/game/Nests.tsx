"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, type Group, type MeshPhongMaterial } from "three";
import { surfaceHeight } from "@/lib/game/collision";
import {
  clutchOffsets,
  EGG_SIT,
  getNestWeaveMap,
  liningFinish,
  nestBowlGeometry,
  NEST_BLEND_RADIUS,
  NEST_FLOOR_LIFT,
  NEST_FLOOR_RADIUS,
  NEST_RIM_LIFT,
  NEST_RIM_RADIUS,
  NEST_SALT,
  NEST_SCOOP,
  NEST_SHELLS,
  reedColor,
  rimLight,
  RIM_WEAVE,
  SPILL_TWIGS,
  type ReedPose,
} from "@/lib/game/nest-look";
import { formAt } from "@/lib/game/progress";
import { speciesDef } from "@/lib/game/species";
import { useGameStore } from "@/lib/game/store";
import { assertNever, type NestSite, type SpeciesId } from "@/lib/game/types";

function Egg({
  x,
  z,
  color,
  phase,
}: {
  x: number;
  z: number;
  color: string;
  phase: number;
}) {
  const group = useRef<Group>(null);
  const shell = useRef<MeshPhongMaterial>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime + phase;
    group.current.position.y = EGG_SIT + Math.sin(t * 1.15) * 0.008;
    group.current.rotation.y = Math.sin(t * 0.22) * 0.06;
    if (shell.current) {
      shell.current.emissiveIntensity = 0.045 + Math.sin(t * 1.4) * 0.02;
    }
  });

  return (
    <group ref={group} position={[x, EGG_SIT, z]} scale={[0.78, 1.08, 0.82]}>
      <mesh castShadow>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshPhongMaterial
          ref={shell}
          color={color}
          emissive={color}
          emissiveIntensity={0.045}
          shininess={28}
          specular="#f4ead8"
        />
      </mesh>
      <mesh position={[0.042, 0.028, 0.038]}>
        <sphereGeometry args={[0.038, 7, 6]} />
        <meshPhongMaterial
          color={NEST_SALT}
          shininess={42}
          specular="#fff8ee"
        />
      </mesh>
      <mesh position={[-0.05, -0.02, 0.02]} scale={[0.55, 0.4, 0.45]}>
        <sphereGeometry args={[0.06, 6, 5]} />
        <meshPhongMaterial
          color={color}
          transparent
          opacity={0.28}
          shininess={8}
          specular="#e8dcc8"
        />
      </mesh>
    </group>
  );
}

function WeaveSkin({ color }: { color: string }) {
  const map = useMemo(() => getNestWeaveMap(color), [color]);
  return (
    <meshPhongMaterial
      map={map}
      color="#ffffff"
      shininess={6}
      specular="#c4b090"
    />
  );
}

function Reed({
  pose,
  color,
}: {
  pose: ReedPose;
  color: string;
}) {
  return (
    <mesh
      position={[pose.x, pose.y, pose.z]}
      rotation={[pose.lean, pose.rot, pose.roll]}
      scale={[pose.sx, pose.sy, pose.sz]}
      castShadow
    >
      <cylinderGeometry args={[1, 1.2, 1, 5]} />
      <meshPhongMaterial color={color} shininess={8} specular="#efe4c8" />
    </mesh>
  );
}

function NestShell({
  x,
  z,
  yaw,
  tilt,
}: {
  x: number;
  z: number;
  yaw: number;
  tilt: number;
}) {
  return (
    <mesh
      position={[x, NEST_FLOOR_LIFT + 0.028, z]}
      rotation={[tilt, yaw, 0.18]}
      scale={[0.055, 0.055, 0.022]}
      castShadow
    >
      <sphereGeometry args={[1, 8, 6]} />
      <meshPhongMaterial
        color="#e8dcc8"
        shininess={22}
        specular="#f6f0e6"
      />
    </mesh>
  );
}

function HomeMarker() {
  return (
    <group
      position={[0.1, NEST_RIM_LIFT + 0.02, -0.16]}
      rotation={[0.1, 0.35, 0.08]}
    >
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.026, 0.038, 0.62, 5]} />
        <meshPhongMaterial color="#c8b890" shininess={8} specular="#d8d0a8" />
      </mesh>
      <mesh
        position={[0.02, 0.58, 0.015]}
        rotation={[0.55, 0.25, 0.4]}
        castShadow
      >
        <torusGeometry args={[0.1, 0.036, 6, 10]} />
        <meshPhongMaterial
          color="#e4d4b4"
          emissive="#d8c898"
          emissiveIntensity={0.14}
          shininess={20}
          specular="#f4eee0"
        />
      </mesh>
    </group>
  );
}

function TideKelp() {
  return (
    <group>
      <mesh
        position={[0.58, 0.5, 0.22]}
        rotation={[0.45, 0.3, 0.28]}
        castShadow
      >
        <coneGeometry args={[0.048, 0.3, 5]} />
        <meshPhongMaterial color="#4a5a44" shininess={8} specular="#8a9c78" />
      </mesh>
      <mesh
        position={[-0.5, 0.48, 0.3]}
        rotation={[0.35, -0.4, -0.22]}
        castShadow
      >
        <coneGeometry args={[0.042, 0.26, 5]} />
        <meshPhongMaterial color="#526448" shininess={8} specular="#8a9c78" />
      </mesh>
    </group>
  );
}

function SpeciesDress({ speciesId }: { speciesId: SpeciesId }) {
  switch (speciesId) {
    case "sporling":
      return null;
    case "tideglider":
      return <TideKelp />;
    case "brambleback":
      return (
        <Reed
          pose={{
            x: 0.82,
            y: 0.44,
            z: -0.36,
            lean: 0.62,
            rot: -0.9,
            roll: 0.2,
            sx: 0.034,
            sy: 0.56,
            sz: 0.038,
          }}
          color="#b8a880"
        />
      );
    default:
      return assertNever(speciesId, "Unknown nest species");
  }
}

function NestMesh({
  nest,
  isHome,
  claimable,
  aimed,
}: {
  nest: NestSite;
  isHome: boolean;
  claimable: boolean;
  aimed: boolean;
}) {
  const species = speciesDef(nest.speciesId);
  const eggs = clutchOffsets(nest.eggs).map((egg) => ({
    ...egg,
    phase: nest.x + egg.phase,
  }));
  const lining = liningFinish(nest.speciesId);
  const twigs = reedColor(nest.speciesId);
  const glow = rimLight(isHome, claimable, aimed);
  const bowl = nestBowlGeometry();
  const mossEmissive = isHome
    ? "#d8c898"
    : claimable || aimed
      ? "#9ec8b0"
      : "#000000";
  const mossIntensity = isHome ? 0.05 : aimed ? 0.14 : claimable ? 0.07 : 0;

  return (
    <group
      position={[nest.x, surfaceHeight(nest.x, nest.z), nest.z]}
      rotation={[0, nest.yaw, 0]}
    >
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.006, 0]}
        receiveShadow
      >
        <circleGeometry args={[NEST_BLEND_RADIUS + 0.28, 20]} />
        <meshPhongMaterial color={NEST_SCOOP} shininess={4} specular="#a09070" />
      </mesh>
      <mesh geometry={bowl} receiveShadow castShadow>
        <meshPhongMaterial
          vertexColors
          shininess={7}
          specular="#c4b49a"
          side={DoubleSide}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, NEST_FLOOR_LIFT + 0.012, 0]}
        receiveShadow
      >
        <circleGeometry args={[NEST_FLOOR_RADIUS, 16]} />
        <meshPhongMaterial
          color={lining.color}
          shininess={lining.shininess}
          specular="#f8f0dc"
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, NEST_FLOOR_LIFT + 0.016, 0]}
      >
        <circleGeometry args={[NEST_FLOOR_RADIUS * 0.72, 14]} />
        <meshPhongMaterial
          color="#4a4030"
          transparent
          opacity={0.22}
          shininess={2}
          specular="#705844"
        />
      </mesh>
      <mesh
        position={[0, 0.46, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <torusGeometry args={[0.62, 0.16, 8, 18]} />
        <WeaveSkin color={species.weave} />
      </mesh>
      <mesh
        position={[0, 0.52, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <torusGeometry args={[0.7, 0.11, 8, 16]} />
        <WeaveSkin color={species.weave} />
      </mesh>
      <mesh
        position={[0, NEST_RIM_LIFT, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[NEST_RIM_RADIUS, 0.09, 8, 16]} />
        <meshPhongMaterial
          color={species.moss}
          shininess={8}
          specular="#e8f0dc"
          emissive={mossEmissive}
          emissiveIntensity={mossIntensity}
        />
      </mesh>
      <mesh
        position={[0, NEST_RIM_LIFT + 0.025, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[NEST_RIM_RADIUS + 0.05, 0.03, 6, 20]} />
        <meshPhongMaterial
          color={glow.color}
          emissive={glow.emissive}
          emissiveIntensity={glow.intensity}
          shininess={14}
          specular="#fff6e4"
          transparent
          opacity={0.78}
        />
      </mesh>
      {RIM_WEAVE.map((pose) => (
        <Reed
          key={`weave-${pose.x}-${pose.z}`}
          pose={pose}
          color={twigs}
        />
      ))}
      {SPILL_TWIGS.map((pose) => (
        <Reed
          key={`spill-${pose.x}-${pose.z}`}
          pose={pose}
          color={twigs}
        />
      ))}
      {NEST_SHELLS.map((shell) => (
        <NestShell key={`${shell.x}-${shell.z}`} {...shell} />
      ))}
      {eggs.map((egg) => (
        <Egg
          key={`${egg.x}-${egg.z}`}
          x={egg.x}
          z={egg.z}
          color={species.egg}
          phase={egg.phase}
        />
      ))}
      <SpeciesDress speciesId={nest.speciesId} />
      {aimed || claimable ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry args={[1.05, 1.18, 22]} />
          <meshBasicMaterial
            color={aimed ? "#c8e8a8" : "#9ec8b0"}
            transparent
            opacity={aimed ? 0.5 : 0.28}
          />
        </mesh>
      ) : null}
      {isHome ? <HomeMarker /> : null}
    </group>
  );
}

export function NestField() {
  const nests = useGameStore((state) => state.nests);
  const homeNestId = useGameStore((state) => state.homeNestId);
  const eaten = useGameStore((state) => state.eaten);
  const waypoint = useGameStore((state) => state.waypoint);
  const claimOpen = formAt(eaten).canClaimNest;

  return (
    <>
      {nests.map((nest) => (
        <NestMesh
          key={nest.id}
          nest={nest}
          isHome={nest.id === homeNestId}
          claimable={claimOpen && nest.id !== homeNestId}
          aimed={waypoint?.kind === "nest" && waypoint.id === nest.id}
        />
      ))}
    </>
  );
}
