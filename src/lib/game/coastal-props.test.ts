import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { COASTAL_PROP_NODES, COASTAL_PROPS_URL } from "./worldgen/props-kit";

const GLB = resolve(process.cwd(), "public", COASTAL_PROPS_URL.replace(/^\//, ""));

function readGlbJson(path: string): { nodes?: { name?: string }[] } {
  const buf = readFileSync(path);
  assert.equal(buf.readUInt32LE(0), 0x46546c67);
  const jsonLength = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8"));
  return json as { nodes?: { name?: string }[] };
}

test("coastal prop kit ships named unit meshes", () => {
  const glb = readGlbJson(GLB);
  const names = new Set((glb.nodes ?? []).map((node) => node.name));
  for (const node of Object.values(COASTAL_PROP_NODES)) {
    assert.ok(names.has(node), `missing kit node ${node}`);
  }
});
