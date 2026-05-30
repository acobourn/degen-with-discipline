// engine/test/buildPicksJson.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPicksJson } from "../src/pipeline/buildPicksJson.js";

const sampleCand = {
  id: "mlb", sport: "MLB", sportLabel: "Baseball", league: "MLB",
  context: "Tigers @ White Sox", matchup: "Detroit Tigers vs Chicago White Sox",
  pick: "Tigers ML", betType: "Moneyline", americanOdds: -115, openAmerican: -105,
  evPct: 0.041, fairProb: 0.54, impliedProb: 0.51, bestBook: "DraftKings",
  confidence: 84, grade: "A-", kellyStake: 2.5, dataPoints: 1200,
  factors: [{ label: "Pitcher form", weight: 80, note: "trending up" }],
  takeShort: "x", takeLong: "y"
};

test("buildPicksJson produces lock + picks with required fields", () => {
  const out = buildPicksJson({ lock: sampleCand, picks: [sampleCand],
    record: { lockStreak: 0, last10: "0-0" }, lastUpdated: "9:41 AM ET", edgesScanned: 12 });
  assert.equal(out.lock.isLock, true);
  assert.equal(out.lock.odds, "-115");
  assert.equal(out.picks.length, 1);
  assert.ok("payoutNote" in out.lock);
  assert.equal(out.lastUpdated, "9:41 AM ET");
});

test("buildPicksJson tolerates an empty slate", () => {
  const out = buildPicksJson({ lock: null, picks: [],
    record: { lockStreak: 0, last10: "0-0" }, lastUpdated: "—", edgesScanned: 0 });
  assert.equal(out.lock, null);
  assert.deepEqual(out.picks, []);
});
