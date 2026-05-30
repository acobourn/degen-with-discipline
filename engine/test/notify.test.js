// engine/test/notify.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { composeAlert } from "../src/io/notify.js";

test("composeAlert summarizes the lock + board with EV and price", () => {
  const msg = composeAlert({
    lock: { matchup: "Tigers vs White Sox", pick: "Tigers ML", odds: "+110", evPct: 0.053, grade: "B+", kellyStake: 1.2, bestBook: "DraftKings" },
    picks: [{ pick: "Yankees ML", odds: "+102", evPct: 0.028, bestBook: "BetMGM" }],
    siteUrl: "https://example.com"
  });
  assert.ok(msg.includes("Tigers ML"));
  assert.ok(msg.includes("5.3% EV"));
  assert.ok(msg.includes("DraftKings"));
  assert.ok(msg.includes("https://example.com"));
});

test("composeAlert returns null when there is nothing to send", () => {
  assert.equal(composeAlert({ lock: null, picks: [] }), null);
});
