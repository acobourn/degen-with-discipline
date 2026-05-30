// engine/test/storeStats.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { summary, calibration, attribution } from "../src/pipeline/store.js";

const settled = [
  { isLock: true, result: "W", grade: "B+", league: "MLB", clvEdge: 0.03, profit: 2.2 },
  { isLock: true, result: "W", grade: "A-", league: "MLB", clvEdge: 0.02, profit: 1.5 },
  { isLock: false, result: "L", grade: "B", league: "NCAA", clvEdge: -0.01, profit: -1 },
  { isLock: false, result: "W", grade: "B+", league: "NCAA", clvEdge: 0.04, profit: 0.9 }
];

test("summary reports streak, record, profit, and avg CLV%", () => {
  const s = summary(settled);
  assert.equal(s.lockStreak, 2);
  assert.equal(s.record, "3-1");
  assert.ok(Math.abs(s.profit - 3.6) < 1e-9);
  assert.ok(s.avgClvPct > 1 && s.avgClvPct < 3); // mean of 3,2,-1,4 % = 2%
});

test("calibration computes real per-grade win rate", () => {
  const c = calibration(settled);
  assert.equal(c["B+"].win, 100); // 2-0
  assert.equal(c["B"].win, 0);    // 0-1
});

test("attribution segments by league with avg CLV", () => {
  const a = attribution(settled);
  const mlb = a.find((x) => x.seg === "MLB");
  assert.equal(mlb.record, "2-0");
  assert.ok(mlb.avgClvPct > 0);
});
