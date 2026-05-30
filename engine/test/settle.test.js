// engine/test/settle.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { teamMatches, gradeMoneyline, gradeTotal, profitFor, clvFor, settleFinished, logRecommended, refreshClosing } from "../src/pipeline/settle.js";

test("refreshClosing updates the closing snapshot for open picks not yet started", () => {
  const now = Date.parse("2026-05-30T22:00:00Z");
  const open = [
    { id: "a", closingFairProb: 0.50, commenceTime: "2026-05-30T23:00:00Z" }, // upcoming -> refresh
    { id: "b", closingFairProb: 0.50, commenceTime: "2026-05-30T20:00:00Z" }  // started -> keep
  ];
  refreshClosing(open, new Map([["a", 0.57], ["b", 0.61]]), now);
  assert.equal(open[0].closingFairProb, 0.57); // refreshed to latest sharp line
  assert.equal(open[1].closingFairProb, 0.50); // game started -> frozen at last pre-game value
});

test("gradeTotal grades over/under against the final combined score", () => {
  const score = { final: true, homeScore: 5, awayScore: 4 }; // total 9
  assert.equal(gradeTotal({ outcomeName: "Over 8.5", point: 8.5 }, score), "W");
  assert.equal(gradeTotal({ outcomeName: "Under 8.5", point: 8.5 }, score), "L");
  assert.equal(gradeTotal({ outcomeName: "Over 9", point: 9 }, score), "P"); // push
  assert.equal(gradeTotal({ outcomeName: "Over 8.5", point: 8.5 }, { final: false }), null);
});

test("teamMatches: subset OK, shared-suffix collision rejected (the critical fix)", () => {
  assert.equal(teamMatches("Detroit Tigers", "Detroit Tigers"), true);
  assert.equal(teamMatches("Athletics", "Oakland Athletics"), true);          // legit subset
  assert.equal(teamMatches("Detroit Tigers", "Chicago White Sox"), false);
  assert.equal(teamMatches("Manchester United", "Newcastle United"), false);  // NOT a shared-suffix match
  assert.equal(teamMatches("Chicago White Sox", "Chicago Cubs"), false);      // same city, different team
});

test("gradeMoneyline returns W/L/null", () => {
  const pick = { outcomeName: "Detroit Tigers", homeTeam: "Chicago White Sox", awayTeam: "Detroit Tigers" };
  assert.equal(gradeMoneyline(pick, { final: true, homeTeam: "Chicago White Sox", awayTeam: "Detroit Tigers", homeScore: 2, awayScore: 5 }), "W");
  assert.equal(gradeMoneyline(pick, { final: true, homeTeam: "Chicago White Sox", awayTeam: "Detroit Tigers", homeScore: 6, awayScore: 1 }), "L");
  assert.equal(gradeMoneyline(pick, { final: false }), null); // not final yet
});

test("gradeMoneyline is draw-aware for 3-way soccer", () => {
  const drawScore = { final: true, homeTeam: "Flamengo", awayTeam: "Palmeiras", homeScore: 1, awayScore: 1 };
  const winScore = { final: true, homeTeam: "Flamengo", awayTeam: "Palmeiras", homeScore: 2, awayScore: 1 };
  assert.equal(gradeMoneyline({ outcomeName: "Flamengo", homeTeam: "Flamengo", awayTeam: "Palmeiras" }, drawScore), "L"); // team loses on a draw
  assert.equal(gradeMoneyline({ outcomeName: "Draw" }, drawScore), "W"); // draw bet wins
  assert.equal(gradeMoneyline({ outcomeName: "Draw" }, winScore), "L");
  assert.equal(gradeMoneyline({ outcomeName: "Flamengo", homeTeam: "Flamengo", awayTeam: "Palmeiras" }, winScore), "W");
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
