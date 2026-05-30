// engine/test/enrich.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { enrich as enrichMlb, buildMlbSignal } from "../src/io/enrichMlb.js";
import { enrich as enrichSoccer } from "../src/io/enrichSoccer.js";

test("buildMlbSignal leans to the clearly stronger side with real factors", () => {
  const s = buildMlbSignal({ home: "Tigers", away: "White Sox",
    homeRec: { w: 8, l: 2 }, awayRec: { w: 3, l: 7 }, homeEra: 2.5, awayEra: 5.0 });
  assert.equal(s.leanTeam, "Tigers");
  assert.equal(s.modelLean, 1);
  assert.equal(s.factors.length, 2);
  assert.ok(s.dataPoints >= 30);
});

test("buildMlbSignal stays neutral when teams are evenly matched", () => {
  const s = buildMlbSignal({ home: "A", away: "B",
    homeRec: { w: 5, l: 5 }, awayRec: { w: 5, l: 5 }, homeEra: 3.8, awayEra: 3.9 });
  assert.equal(s.leanTeam, null);
  assert.equal(s.modelLean, 0);
});

test("enrichMlb returns a neutral, well-formed signal in demo mode", async () => {
  const r = await enrichMlb({ home: "Chicago White Sox", away: "Detroit Tigers" });
  assert.equal(typeof r.modelLean, "number");
  assert.ok(Array.isArray(r.factors));
  assert.ok(r.dataPoints >= 0);
});

test("enrichSoccer never throws and returns a signal", async () => {
  const r = await enrichSoccer({ home: "Inter Miami", away: "Orlando City" });
  assert.equal(typeof r.modelLean, "number");
  assert.ok(Array.isArray(r.factors));
});
