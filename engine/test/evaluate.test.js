// engine/test/evaluate.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateGameMarket } from "../src/pipeline/evaluate.js";

const targetBooks = ["draftkings", "betmgm", "fanduel", "bet365"];

test("evaluateGameMarket handles moneyline (h2h)", () => {
  const game = {
    market: "h2h", outcomes: ["Detroit Tigers", "Chicago White Sox"],
    books: [
      { key: "draftkings", title: "DraftKings", odds: [2.10, 1.80] },
      { key: "fanduel", title: "FanDuel", odds: [1.95, 1.95] },
      { key: "betmgm", title: "BetMGM", odds: [1.93, 1.97] },
      { key: "caesars", title: "Caesars", odds: [1.94, 1.96] }
    ]
  };
  const out = evaluateGameMarket(game, { targetBooks });
  assert.equal(out.length, 2);
  const det = out.find((o) => o.outcomeName === "Detroit Tigers");
  assert.equal(det.bestTitle, "DraftKings"); // 2.10 is the best Detroit price
  assert.ok(det.fairProb > 0.45 && det.fairProb < 0.55);
});

test("evaluateGameMarket groups totals by the most common line", () => {
  const game = {
    market: "totals", outcomes: ["Over", "Under"],
    books: [
      { key: "draftkings", title: "DraftKings", odds: [1.95, 1.91], point: 8.5 },
      { key: "fanduel", title: "FanDuel", odds: [1.91, 1.95], point: 8.5 },
      { key: "betmgm", title: "BetMGM", odds: [1.93, 1.93], point: 8.5 },
      { key: "caesars", title: "Caesars", odds: [2.10, 1.80], point: 9.0 } // odd line out
    ]
  };
  const out = evaluateGameMarket(game, { targetBooks });
  assert.equal(out.length, 2);
  assert.ok(out[0].outcomeName.includes("8.5")); // consensus line is 8.5 (3 books)
  assert.equal(out[0].point, 8.5);
});

test("evaluateGameMarket anchors fair value on the SHARP book when present", () => {
  const game = { market: "h2h", outcomes: ["A", "B"], books: [
    { key: "pinnacle", title: "Pinnacle", odds: [1.98, 1.98] },     // sharp: ~50/50 no-vig
    { key: "draftkings", title: "DraftKings", odds: [2.20, 1.74] }, // soft: generous on A
    { key: "fanduel", title: "FanDuel", odds: [2.15, 1.77] },
    { key: "betmgm", title: "BetMGM", odds: [2.12, 1.79] }
  ]};
  const out = evaluateGameMarket(game, { targetBooks: ["draftkings", "fanduel", "betmgm"], sharpBooks: ["pinnacle"] });
  const a = out.find((o) => o.outcomeName === "A");
  assert.equal(a.sharp, true);
  assert.ok(Math.abs(a.fairProb - 0.5) < 0.02); // anchored to Pinnacle ~50%, NOT the soft ~46%
  assert.equal(a.bestTitle, "DraftKings");       // best A price among soft target books (2.20)
});

test("evaluateGameMarket falls back to soft consensus when no sharp book present", () => {
  const game = { market: "h2h", outcomes: ["A", "B"], books: [
    { key: "draftkings", title: "DraftKings", odds: [2.10, 1.80] },
    { key: "fanduel", title: "FanDuel", odds: [1.95, 1.95] },
    { key: "betmgm", title: "BetMGM", odds: [1.93, 1.97] },
    { key: "caesars", title: "Caesars", odds: [1.94, 1.96] }
  ]};
  const out = evaluateGameMarket(game, { targetBooks: ["draftkings", "betmgm", "fanduel"], sharpBooks: ["pinnacle"] });
  assert.equal(out[0].sharp, false); // no Pinnacle -> soft fallback, flagged low-confidence
});

test("evaluateGameMarket returns [] when no target book is present", () => {
  const game = { market: "h2h", outcomes: ["A", "B"],
    books: [{ key: "bovada", title: "Bovada", odds: [2.0, 2.0] }] };
  assert.deepEqual(evaluateGameMarket(game, { targetBooks }), []);
});
