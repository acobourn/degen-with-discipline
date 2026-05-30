// engine/test/oddsClient.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeOddsResponse } from "../src/io/oddsClient.js";
import { readFileSync } from "node:fs";

test("normalizeOddsResponse groups books per outcome with a stable order", () => {
  const raw = JSON.parse(readFileSync(new URL("../fixtures/odds-mlb-h2h.json", import.meta.url)));
  const games = normalizeOddsResponse(raw, "h2h");
  assert.equal(games.length, 2);
  const g = games[0];
  assert.equal(g.outcomes.length, 2);
  assert.equal(g.books.length, 5);
  // each book exposes decimal odds aligned to g.outcomes order
  const dk = g.books.find((b) => b.key === "draftkings");
  assert.equal(dk.odds.length, 2);
});
