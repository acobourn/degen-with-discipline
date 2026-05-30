// engine/test/kelly.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { kellyStake } from "../src/math/kelly.js";

test("kellyStake sizes from edge, fraction, and bankroll", () => {
  // p=0.55, dec=2.0 -> full Kelly f = (0.55*2-1)/(2-1) = 0.10
  // quarter Kelly = 0.025 of 100 = $2.50, under 3% cap
  const s = kellyStake({ fairProb: 0.55, offeredDecimal: 2.0, bankroll: 100,
    fraction: 0.25, maxPct: 0.03, uncertainty: 1 });
  assert.ok(Math.abs(s - 2.5) < 1e-6);
});

test("kellyStake respects the max-pct cap", () => {
  // huge edge -> quarter Kelly would exceed 3%; capped at $3 on $100
  const s = kellyStake({ fairProb: 0.8, offeredDecimal: 2.0, bankroll: 100,
    fraction: 0.25, maxPct: 0.03, uncertainty: 1 });
  assert.ok(Math.abs(s - 3) < 1e-6);
});

test("kellyStake shrinks on thin data and never goes negative", () => {
  const thin = kellyStake({ fairProb: 0.55, offeredDecimal: 2.0, bankroll: 100,
    fraction: 0.25, maxPct: 0.03, uncertainty: 0.5 });
  assert.ok(Math.abs(thin - 1.25) < 1e-6);
  const neg = kellyStake({ fairProb: 0.4, offeredDecimal: 2.0, bankroll: 100,
    fraction: 0.25, maxPct: 0.03, uncertainty: 1 });
  assert.equal(neg, 0); // -EV -> no bet
});
