// engine/test/clv.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { clvEdge } from "../src/math/clv.js";

test("clvEdge positive when you beat the close", () => {
  // you bet at decimal 2.10 (implied 0.4762); fair at close 0.52 -> beat by ~0.044
  const e = clvEdge({ betDecimal: 2.10, closingFairProb: 0.52 });
  assert.ok(e > 0.04 && e < 0.05);
});

test("clvEdge negative when the close moved against you", () => {
  const e = clvEdge({ betDecimal: 1.80, closingFairProb: 0.52 });
  assert.ok(e < 0); // implied 0.5556 > 0.52
});
