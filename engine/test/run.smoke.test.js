// engine/test/run.smoke.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "../src/pipeline/run.js";

test("run() produces a valid picks payload in demo mode", async () => {
  const out = await run();
  assert.ok("lock" in out);
  assert.ok(Array.isArray(out.picks));
  assert.ok(out.edgesScanned >= 1);
  // The fixture's DraftKings price (2.10) on Detroit is the deliberate +EV edge.
  if (out.lock) assert.ok(out.lock.evPct > 0);
});
