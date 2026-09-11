"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshBasicMaterial, MeshPhongMaterial } from "three";
import { WATER_Y } from "@/lib/game/collision";
import { createOceanGeometry } from "@/lib/game/ocean-mesh";
import { SHORE, SHORE_BAND } from "@/lib/game/shore-look";

function OceanDisc({ coarse }: { coarse: boolean }) {
  const geometry = useMemo(
    () => createOceanGeometry(coarse ? 8 : 12, coarse ? 32 : 48),
    [coarse],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={[0, WATER_Y - 0.028, 0]}>
      <meshPhongMaterial
        vertexColors
        shininess={SHORE.midShininess}
        specular={SHORE.waterSpecularMid}
      />
    </mesh>
  );
}

function PulsingFoamMaterial({
  opacity,
  pulse = SHORE.foamPulse,
}: {
  opacity: number;
  pulse?: number;
}) {
  const ref = useRef<MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.opacity =
      opacity + Math.sin(clock.elapsedTime * SHORE.foamHz * Math.PI * 2) * pulse;
  });
  return (
    <meshBasicMaterial
      ref={ref}
      color={SHORE.foam}
      transparent
      depthWrite={false}
    />
  );
}

/** Shared by World foam rings and dress / tide-pool lace. */
export function ShoreFoamMaterial({
  opacity = SHORE.foamPatchOpacity,
}: {
  opacity?: number;
}) {
  return <PulsingFoamMaterial opacity={opacity} />;
}

function FoamLace({ coarse }: { coarse: boolean }) {
  const inner = useRef<MeshBasicMaterial>(null);
  const outer = useRef<MeshBasicMaterial>(null);
  const segs = coarse ? 32 : 48;

  useFrame(({ clock }) => {
    const wave = Math.sin(clock.elapsedTime * SHORE.foamHz * Math.PI * 2);
    if (inner.current) {
      inner.current.opacity = SHORE.foamInnerOpacity + wave * SHORE.foamPulse;
    }
    if (outer.current) {
      outer.current.opacity =
        SHORE.foamOuterOpacity + wave * SHORE.foamPulse * 0.65;
    }
  });

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, WATER_Y + 0.02, 0]}
        renderOrder={2}
      >
        <ringGeometry
          args={[SHORE_BAND.foamMid, SHORE_BAND.foamOuter, segs]}
        />
        <meshBasicMaterial
          ref={outer}
          color={SHORE.foamShadow}
          transparent
          opacity={SHORE.foamOuterOpacity}
          depthWrite={false}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, WATER_Y + 0.026, 0]}
        renderOrder={3}
      >
        <ringGeometry
          args={[SHORE_BAND.foamInner, SHORE_BAND.foamMid, segs]}
        />
        <meshBasicMaterial
          ref={inner}
          color={SHORE.foam}
          transparent
          opacity={SHORE.foamInnerOpacity}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function ShallowsOverlay({ coarse }: { coarse: boolean }) {
  const spec = useRef<MeshPhongMaterial>(null);
  const segs = coarse ? 32 : 48;

  useFrame(({ clock }) => {
    if (!spec.current) return;
    spec.current.opacity =
      SHORE.shallowsOpacity +
      Math.sin(clock.elapsedTime * SHORE.foamHz * Math.PI * 2) * 0.025;
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, WATER_Y + 0.008, 0]}
      renderOrder={1}
    >
      <ringGeometry
        args={[SHORE_BAND.shallowsInner, SHORE_BAND.shallowsOuter, segs]}
      />
      <meshPhongMaterial
        ref={spec}
        color={SHORE.shallowsOverlay}
        transparent
        opacity={SHORE.shallowsOpacity}
        shininess={SHORE.shallowsShininess}
        specular={SHORE.waterSpecularShallow}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

/**
 * Near-shore water, shallows clarity, and foam lace.
 * Lighting / fog stay in `World` (other agents own mood).
 */
export function ShoreWater({ coarse }: { coarse: boolean }) {
  return (
    <>
      <OceanDisc coarse={coarse} />
      <ShallowsOverlay coarse={coarse} />
      <FoamLace coarse={coarse} />
    </>
  );
}
