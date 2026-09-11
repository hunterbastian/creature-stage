export type PropPose = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
};

export type TidePoolSpec = {
  x: number;
  z: number;
  sx: number;
  sz: number;
  yaw: number;
};

export type ClearingSpec = {
  x: number;
  z: number;
  radius: number;
  color: string;
};

export type LandformKind = "cliff" | "isle" | "stack";

export type LandformSpec = {
  x: number;
  z: number;
  scale: number;
  rot: number;
  kind: LandformKind;
};

export type GroveSpec = {
  x: number;
  z: number;
  count: number;
  salt: number;
  /** Arc width in radians. Wider = strip, tight = pocket. */
  span: number;
};

export type HazeSpec = {
  x: number;
  y: number;
  z: number;
  radius: number;
};

export type ShoreSectorKind =
  | "tideTerrace"
  | "kelpWrack"
  | "rockShelf"
  | "shellFan";

export type ShoreSector = {
  kind: ShoreSectorKind;
  angle: number;
  span: number;
  inner: number;
  outer: number;
};

export type KeepOut = {
  x: number;
  z: number;
  radius: number;
  reason: "pool" | "shelf" | "nest";
};

export type WorldDress = {
  grass: PropPose[];
  reeds: PropPose[];
  dryRocks: PropPose[];
  wetRocks: PropPose[];
  shells: PropPose[];
  kelp: PropPose[];
  driftwood: PropPose[];
  trunks: PropPose[];
  crowns: PropPose[];
  canopies: PropPose[];
  scrub: PropPose[];
  spirals: PropPose[];
  foam: PropPose[];
  shelves: PropPose[];
  mistWalls: PropPose[];
  haze: HazeSpec[];
  tidePools: TidePoolSpec[];
  clearings: ClearingSpec[];
  landforms: LandformSpec[];
};
