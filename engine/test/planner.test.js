// engine/test/planner.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScanPlan } from "../src/pipeline/planner.js";

const anchors = [{ key: "baseball_mlb", markets: ["h2h", "totals"] }]; // 2 credits
const rotation = [
  { key: "soccer_brazil", markets: ["h2h"] },
  { key: "soccer_japan", markets: ["h2h"] },
  { key: "soccer_norway", markets: ["h2h"] },
  { key: "baseball_npb", markets: ["h2h"] }
];

test("buildScanPlan fills to the credit target and advances the rotation index", () => {
  const { plan, nextIndex, credits } = buildScanPlan(anchors, rotation, { rotationIndex: 0, creditTarget: 5 });
  // anchors=2 credits, then 3 rotation leagues (1 each) -> 5 credits
  assert.equal(credits, 5);
  assert.equal(plan.length, 4); // 1 anchor + 3 rotation
  assert.equal(nextIndex, 3);   // next run starts at the 4th pool item
});

test("buildScanPlan wraps the rotation and covers the rest next run", () => {
  const { plan, nextIndex } = buildScanPlan(anchors, rotation, { rotationIndex: 3, creditTarget: 5 });
  assert.equal(plan[1].key, "baseball_npb");   // starts where it left off
  assert.equal(plan[2].key, "soccer_brazil");  // then wraps around
  assert.equal(nextIndex, 2);
});

test("buildScanPlan skips inactive leagues", () => {
  const active = new Set(["baseball_mlb", "soccer_japan"]);
  const { plan } = buildScanPlan(anchors, rotation, { activeKeys: active, rotationIndex: 0, creditTarget: 5 });
  const keys = plan.map((p) => p.key);
  assert.ok(keys.includes("baseball_mlb"));
  assert.ok(keys.includes("soccer_japan"));
  assert.ok(!keys.includes("soccer_brazil")); // inactive -> skipped
});
