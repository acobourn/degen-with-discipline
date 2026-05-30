// engine/test/enrich.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { enrich as enrichMlb } from "../src/io/enrichMlb.js";
import { enrich as enrichSoccer } from "../src/io/enrichSoccer.js";

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
