// engine/test/boost.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { legFairProb, applyProfitBoost, evaluateBoost, boostStake } from "../src/pipeline/boost.js";

test("legFairProb de-vigs a -110 to roughly 50%", () => {
  assert.ok(Math.abs(legFairProb(-110) - 0.50) < 0.01);
});

test("applyProfitBoost raises the profit portion", () => {
  // -110 (decimal 1.909, profit 0.909) with 50% boost -> 1 + 0.909*1.5 = 2.3636
  assert.ok(Math.abs(applyProfitBoost(-110, 50) - 2.3636) < 1e-3);
});

test("evaluateBoost flags a genuinely +EV boost", () => {
  // selection normally -150 (fair ~57%), boosted to +120 (decimal 2.2) -> strongly +EV
  const r = evaluateBoost([{ marketAmerican: -150, boostedAmerican: 120 }]);
  assert.ok(r.evPct > 0.05);
  assert.equal(r.verdict, "STRONG — take it");
});

test("evaluateBoost rejects a bad 'boost' that is still -EV", () => {
  // market +200 (fair ~32%), 'boosted' to +210 (decimal 3.1) -> 0.319*3.1-1 ≈ -0.01 .. skip/coin
  const r = evaluateBoost([{ marketAmerican: 200, boostedAmerican: 210 }]);
  assert.ok(r.evPct < 0.01);
});

test("evaluateBoost multiplies legs for a boosted parlay", () => {
  const r = evaluateBoost([
    { marketAmerican: -110, boostedAmerican: 100 },
    { marketAmerican: -110, boostedAmerican: 100 }
  ]);
  assert.ok(Math.abs(r.boostedDecimal - 4.0) < 1e-9); // 2.0 * 2.0
  assert.ok(r.fairProb > 0.24 && r.fairProb < 0.26);  // ~0.5 * 0.5
});

test("boostStake sizes a +EV boost off the bankroll", () => {
  const s = boostStake(0.55, 2.0, 100);
  assert.ok(s > 0 && s <= 3); // capped at 3% of $100
});
