// engine/test/confirm.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmPick } from "../src/pipeline/confirm.js";

test("fires when EV is positive and the model lean agrees", () => {
  const r = confirmPick({ evPct: 0.04, modelLean: +1, bookCount: 6, dataPoints: 1200 });
  assert.equal(r.fire, true);
  assert.ok(r.confidence >= 70 && r.confidence <= 100);
});

test("suppresses when the model lean contradicts the market", () => {
  const r = confirmPick({ evPct: 0.04, modelLean: -1, bookCount: 6, dataPoints: 1200 });
  assert.equal(r.fire, false);
  assert.equal(r.reason, "model_contradicts_market");
});

test("neutral lean still fires on price alone", () => {
  const r = confirmPick({ evPct: 0.04, modelLean: 0, bookCount: 6, dataPoints: 1200 });
  assert.equal(r.fire, true);
});
