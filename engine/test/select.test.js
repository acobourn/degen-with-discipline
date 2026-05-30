// engine/test/select.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeFor, qualifies, pickLock } from "../src/math/select.js";

test("gradeFor maps confidence to letters", () => {
  assert.equal(gradeFor(93), "A+");
  assert.equal(gradeFor(86), "A");
  assert.equal(gradeFor(60), "B-");
});

test("qualifies enforces EV and book-count gates", () => {
  assert.equal(qualifies({ evPct: 0.03, bookCount: 5 }, { evThreshold: 0.02, minBooks: 4 }), true);
  assert.equal(qualifies({ evPct: 0.01, bookCount: 9 }, { evThreshold: 0.02, minBooks: 4 }), false);
  assert.equal(qualifies({ evPct: 0.05, bookCount: 2 }, { evThreshold: 0.02, minBooks: 4 }), false);
});

test("pickLock takes best EV inside the -125..+125 band", () => {
  const cands = [
    { id: "a", evPct: 0.09, americanOdds: -200 }, // best EV but out of band
    { id: "b", evPct: 0.06, americanOdds: -110 }, // in band
    { id: "c", evPct: 0.04, americanOdds: 120 }   // in band, lower EV
  ];
  const lock = pickLock(cands, { minAmerican: -125, maxAmerican: 125 });
  assert.equal(lock.id, "b");
});

test("pickLock returns null when nothing is in band", () => {
  const lock = pickLock([{ id: "a", evPct: 0.09, americanOdds: -200 }],
    { minAmerican: -125, maxAmerican: 125 });
  assert.equal(lock, null);
});
