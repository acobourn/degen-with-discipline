// engine/test/copy.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { takeShort, takeLong } from "../src/pipeline/copy.js";

test("takeShort mentions the edge and stays a non-empty string", () => {
  const s = takeShort({ pick: "Tigers ML", evPct: 0.04, topFactor: "Pitcher form" });
  assert.equal(typeof s, "string");
  assert.ok(s.length > 0);
});

test("takeLong includes the numeric edge and book", () => {
  const s = takeLong({ pick: "Tigers ML", evPct: 0.041, fairProb: 0.54,
    impliedProb: 0.51, bestBook: "DraftKings", topFactor: "Pitcher form" });
  assert.ok(s.includes("4.1%"));
  assert.ok(s.includes("DraftKings"));
});
