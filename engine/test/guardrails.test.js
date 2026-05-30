// engine/test/guardrails.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { median, robustConsensus, passesGuards, filterCoherent } from "../src/math/guardrails.js";

test("median ignores a single wild outlier", () => {
  assert.ok(Math.abs(median([0.50, 0.51, 0.49, 0.95]) - 0.505) < 1e-9);
});

test("robustConsensus is immune to one outlier book but flags the disagreement", () => {
  const books = [
    { key: "a", odds: [2.00, 2.00] },
    { key: "b", odds: [1.98, 2.02] },
    { key: "c", odds: [2.02, 1.98] },
    { key: "d", odds: [2.00, 2.00] },
    { key: "e", odds: [1.25, 5.0] }  // outlier: implies ~0.80 on outcome 0
  ];
  const r = robustConsensus(books, {});
  assert.ok(Math.abs(r.fair[0] - 0.5) < 0.05);   // median resists the outlier
  assert.ok(r.dispersion > 0.2);                  // but the spread is flagged
});

test("passesGuards rejects too-good EV, high dispersion, absurd odds, too few books", () => {
  const g = { minBooks: 4, evThreshold: 0.02, maxEvPct: 0.08, maxDispersion: 0.08, saneOdds: { min: -250, max: 250 } };
  assert.equal(passesGuards({ evPct: 0.04, bookCount: 6, dispersion: 0.03, americanOdds: -110 }, g), true);
  assert.equal(passesGuards({ evPct: 0.15, bookCount: 6, dispersion: 0.03, americanOdds: -110 }, g), false); // too good
  assert.equal(passesGuards({ evPct: 0.04, bookCount: 6, dispersion: 0.20, americanOdds: -110 }, g), false); // noisy
  assert.equal(passesGuards({ evPct: 0.04, bookCount: 6, dispersion: 0.03, americanOdds: -833 }, g), false); // absurd odds
  assert.equal(passesGuards({ evPct: 0.04, bookCount: 3, dispersion: 0.03, americanOdds: -110 }, g), false); // too few books
});

test("filterCoherent drops games with +EV on both sides", () => {
  const cands = [
    { gameId: "g1", pick: "A" }, { gameId: "g1", pick: "B" }, // both sides -> incoherent
    { gameId: "g2", pick: "C" }                               // single side -> keep
  ];
  const out = filterCoherent(cands);
  assert.equal(out.length, 1);
  assert.equal(out[0].gameId, "g2");
});
