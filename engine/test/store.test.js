// engine/test/store.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadStore, recordToSummary } from "../src/pipeline/store.js";

test("loadStore reads bankroll + history", () => {
  const s = loadStore();
  assert.ok(s.bankroll.bankroll >= 0);
  assert.ok(Array.isArray(s.history.settled));
});

test("recordToSummary yields lockStreak + last10", () => {
  const r = recordToSummary({ settled: [
    { isLock: true, result: "W" }, { isLock: true, result: "W" }, { isLock: false, result: "L" }
  ]});
  assert.equal(r.lockStreak, 2);
  assert.equal(typeof r.last10, "string");
});
