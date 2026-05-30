// engine/test/settle.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { teamMatches, gradeMoneyline, profitFor, clvFor, settleFinished, logRecommended } from "../src/pipeline/settle.js";

test("teamMatches handles spelling/format differences", () => {
  assert.equal(teamMatches("Detroit Tigers", "Detroit Tigers"), true);
  assert.equal(teamMatches("NY Yankees", "New York Yankees"), true); // shared mascot 'yankees'
  assert.equal(teamMatches("Detroit Tigers", "Chicago White Sox"), false);
});

test("gradeMoneyline returns W/L/null", () => {
  const pick = { outcomeName: "Detroit Tigers", homeTeam: "Chicago White Sox", awayTeam: "Detroit Tigers" };
  assert.equal(gradeMoneyline(pick, { final: true, homeTeam: "Chicago White Sox", awayTeam: "Detroit Tigers", homeScore: 2, awayScore: 5 }), "W");
  assert.equal(gradeMoneyline(pick, { final: true, homeTeam: "Chicago White Sox", awayTeam: "Detroit Tigers", homeScore: 6, awayScore: 1 }), "L");
  assert.equal(gradeMoneyline(pick, { final: false }), null); // not final yet
});

test("profitFor pays out wins, loses stake, pushes to zero", () => {
  assert.ok(Math.abs(profitFor("W", 2, 2.1) - 2.2) < 1e-9); // 2 * 1.1
  assert.equal(profitFor("L", 2, 2.1), -2);
  assert.equal(profitFor("P", 2, 2.1), 0);
});

test("clvFor is positive when the flagged price beat the close", () => {
  const clv = clvFor({ decimalOdds: 2.10, closingFairProb: 0.52 });
  assert.ok(clv > 0.04 && clv < 0.05);
});

test("settleFinished grades open picks, updates bankroll, and records CLV", () => {
  const history = { open: [{
    id: "p1", outcomeName: "Detroit Tigers", homeTeam: "Chicago White Sox", awayTeam: "Detroit Tigers",
    decimalOdds: 2.10, stake: 2, closingFairProb: 0.52, isLock: true, grade: "B+", league: "MLB"
  }], settled: [] };
  const finals = [{ final: true, homeTeam: "Chicago White Sox", awayTeam: "Detroit Tigers", homeScore: 3, awayScore: 7 }];
  const r = settleFinished({ history, bankroll: { bankroll: 100 }, finals, nowIso: "2026-05-30T23:00:00Z" });
  assert.equal(r.history.open.length, 0);
  assert.equal(r.history.settled.length, 1);
  assert.equal(r.history.settled[0].result, "W");
  assert.ok(Math.abs(r.bankroll.bankroll - 102.2) < 1e-9); // +2*1.1
  assert.ok(r.history.settled[0].clvEdge > 0);
});

test("logRecommended adds new open picks and dedupes by id", () => {
  let history = { open: [], settled: [] };
  const recs = [{ id: "a", gameId: "g", oddsSportKey: "baseball_mlb", matchup: "X vs Y",
    pick: "Y ML", outcomeName: "Y", americanOdds: 110, decimalOdds: 2.1, fairProb: 0.5, stake: 1 }];
  history = logRecommended(history, recs, "t1");
  assert.equal(history.open.length, 1);
  history = logRecommended(history, recs, "t2"); // same pick again -> no dupe
  assert.equal(history.open.length, 1);
});
