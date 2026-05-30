// engine/test/devig.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { devigPower, consensusFairProb } from "../src/math/devig.js";

test("devigPower removes margin so probs sum to 1", () => {
  // -110/-110 two-way market: implied 0.5238 each, sum 1.0476
  const fair = devigPower([1.909, 1.909]);
  const sum = fair.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-6);
  assert.ok(Math.abs(fair[0] - 0.5) < 1e-6);
});

test("devigPower keeps favorite as favorite", () => {
  const fair = devigPower([1.5, 2.8]); // favorite first
  assert.ok(fair[0] > fair[1]);
  assert.ok(Math.abs(fair[0] + fair[1] - 1) < 1e-6);
});

test("consensusFairProb averages books and excludes the target book", () => {
  // outcomeIndex 0 across 3 books; target book excluded from fair value
  const books = [
    { key: "pinnacleish", odds: [1.95, 1.95] },
    { key: "softA", odds: [1.91, 2.00] },
    { key: "draftkings", odds: [2.10, 1.80] } // target, generous on outcome 0
  ];
  const fair = consensusFairProb(books, { excludeKey: "draftkings" });
  // fair[0] computed only from the other two -> ~0.503..0.51, NOT inflated by DK's 2.10
  assert.ok(fair[0] < 0.52 && fair[0] > 0.48);
});
