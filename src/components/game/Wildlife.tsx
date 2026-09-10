"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { isCoarsePointer } from "@/lib/game/device";
import { useGameStore } from "@/lib/game/store";
import { fauna } from "@/lib/game/wildlife";
import { CreatureVisual } from "./Creature";

function WildlifeCritter({ agentId }: { agentId: string }) {
  const root = useRef<Group>(null);
  const playerParts = useGameStore((state) => state.parts);
  const agent = useMemo(
    () => fauna.agents.find((item) => item.id === agentId),
    [agentId],
  );
  const castShadow = useMemo(() => !isCoarsePointer(), []);

  useFrame(() => {
    if (!root.current || !agent) return;
    root.current.position.set(agent.x, 0, agent.z);
    root.current.rotation.y = agent.yaw;
    root.current.scale.setScalar(agent.size);
  });

  if (!agent) return null;

  const parts = agent.mirrorsPlayer ? playerParts : agent.parts;

  return (
    <group ref={root}>
      <CreatureVisual
        parts={parts}
        locomotion={agent}
        castShadow={castShadow}
      />
    </group>
  );
}

export function WildlifeField() {
  const epoch = useGameStore((state) => state.meadowEpoch);

  return (
    <>
      {fauna.agents.map((agent) => (
        <WildlifeCritter key={`${epoch}-${agent.id}`} agentId={agent.id} />
      ))}
    </>
  );
}
