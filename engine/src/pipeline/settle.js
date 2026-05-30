// settle.js — grade tracked picks, compute profit + CLV, fold into the store.
// Pure core (deterministic); the score-fetching I/O lives in io/scores.js.
import { clvEdge } from "../math/clv.js";

// Normalize a team name so the Odds API and ESPN can be matched despite spelling.
export function normTeam(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|fc|sc|cf|club)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function lastWord(s) { const p = s.split(" "); return p[p.length - 1]; }

export function teamMatches(a, b) {
  const x = normTeam(a), y = normTeam(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.includes(y) || y.includes(x)) return true;
  return lastWord(x) === lastWord(y) && lastWord(x).length >= 4;
}

// True if a final-score record is the same game as the pick (either home/away order).
export function pairMatches(pick, f) {
  const a = teamMatches(pick.homeTeam, f.homeTeam) && teamMatches(pick.awayTeam, f.awayTeam);
  const b = teamMatches(pick.homeTeam, f.awayTeam) && teamMatches(pick.awayTeam, f.homeTeam);
  return a || b;
}

// Decide W / L / P for a moneyline pick given a FINAL score. null if not final.
export function gradeMoneyline(pick, score) {
  if (!score || !score.final) return null;
  if (score.homeScore === score.awayScore) return "P";
  const winner = score.homeScore > score.awayScore ? score.homeTeam : score.awayTeam;
  return teamMatches(pick.outcomeName, winner) ? "W" : "L";
}

export function profitFor(result, stake, decimalOdds) {
  if (result === "W") return Math.round(stake * (decimalOdds - 1) * 100) / 100;
  if (result === "L") return -stake;
  return 0; // push
}

// CLV: did the price we flagged beat the closing consensus fair probability?
export function clvFor(pick) {
  if (pick.closingFairProb == null || pick.decimalOdds == null) return null;
  return clvEdge({ betDecimal: pick.decimalOdds, closingFairProb: pick.closingFairProb });
}

function matchFinal(pick, finals) {
  return finals.find((f) => f.final && pairMatches(pick, f));
}

// Settle any open picks that now have a final score. Updates bankroll. Pure.
export function settleFinished({ history, bankroll, finals, nowIso }) {
  const settled = [...(history.settled || [])];
  const stillOpen = [];
  const newlySettled = [];
  let bank = bankroll.bankroll;
  for (const o of history.open || []) {
    const result = gradeMoneyline(o, matchFinal(o, finals));
    if (result == null) { stillOpen.push(o); continue; }
    const profit = profitFor(result, o.stake || 0, o.decimalOdds);
    const rec = { ...o, result, profit, clvEdge: clvFor(o), settledAt: nowIso };
    settled.unshift(rec);
    newlySettled.push(rec);
    bank = Math.round((bank + profit) * 100) / 100;
  }
  return {
    history: { ...history, open: stillOpen, settled },
    bankroll: { ...bankroll, bankroll: bank, updated: nowIso },
    newlySettled
  };
}

// Log today's recommended picks as open (dedupe by id); refresh closing fair prob. Pure.
export function logRecommended(history, recommended, nowIso) {
  const open = [...(history.open || [])];
  const settledIds = new Set((history.settled || []).map((s) => s.id));
  for (const r of recommended) {
    if (settledIds.has(r.id)) continue;
    const existing = open.find((o) => o.id === r.id);
    if (existing) {
      existing.closingFairProb = r.fairProb; // latest pre-game consensus ≈ closing
    } else {
      open.push({
        id: r.id, gameId: r.gameId, oddsSportKey: r.oddsSportKey,
        sport: r.sport, league: r.league, market: r.market || "h2h",
        matchup: r.matchup, homeTeam: r.homeTeam, awayTeam: r.awayTeam,
        pick: r.pick, outcomeName: r.outcomeName,
        americanOdds: r.americanOdds, decimalOdds: r.decimalOdds,
        evPct: r.evPct, fairProb: r.fairProb, closingFairProb: r.fairProb,
        grade: r.grade, isLock: !!r.isLock, stake: r.stake,
        flaggedAt: nowIso, commenceTime: r.commenceTime
      });
    }
  }
  return { ...history, open };
}
