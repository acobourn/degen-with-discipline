// Read/write the repo-as-database files. Paths are relative to repo root.
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../../", import.meta.url); // repo root from engine/src/pipeline/
const BANKROLL = new URL("data/bankroll.json", ROOT);
const HISTORY = new URL("data/history.json", ROOT);

export function loadStore() {
  return {
    bankroll: JSON.parse(readFileSync(BANKROLL)),
    history: JSON.parse(readFileSync(HISTORY))
  };
}

export function saveBankroll(b) { writeFileSync(BANKROLL, JSON.stringify(b, null, 2)); }
export function saveHistory(h) { writeFileSync(HISTORY, JSON.stringify(h, null, 2)); }

// Compute the slim record strip (lock streak + last 10 locks).
export function recordToSummary(history) {
  const locks = history.settled.filter((s) => s.isLock);
  let streak = 0;
  for (const l of locks) { if (l.result === "W") streak++; else break; }
  const last10 = locks.slice(0, 10);
  const w = last10.filter((l) => l.result === "W").length;
  return { lockStreak: streak, last10: `${w}-${last10.length - w}` };
}

// Overall summary incl. real CLV (the leading indicator of edge) and profit. Pure.
export function summary(settled) {
  const locks = settled.filter((s) => s.isLock);
  let streak = 0;
  for (const l of locks) { if (l.result === "W") streak++; else break; }
  const last10 = locks.slice(0, 10);
  const lw = last10.filter((l) => l.result === "W").length;
  const clvVals = settled.filter((s) => typeof s.clvEdge === "number").map((s) => s.clvEdge);
  const avgClv = clvVals.length ? clvVals.reduce((a, b) => a + b, 0) / clvVals.length : null;
  const profit = settled.reduce((a, s) => a + (s.profit || 0), 0);
  const w = settled.filter((s) => s.result === "W").length;
  const l = settled.filter((s) => s.result === "L").length;
  return {
    lockStreak: streak,
    last10: `${lw}-${last10.length - lw}`,
    record: `${w}-${l}`,
    settledCount: settled.length,
    profit: Math.round(profit * 100) / 100,
    avgClvPct: avgClv != null ? Math.round(avgClv * 1000) / 10 : null
  };
}

// Real grade reliability from settled results (powers the UI's grade table). Pure.
export function calibration(settled) {
  const byGrade = {};
  for (const s of settled) {
    if (!s.grade || (s.result !== "W" && s.result !== "L")) continue;
    (byGrade[s.grade] ||= { w: 0, l: 0, profit: 0 });
    const g = byGrade[s.grade];
    if (s.result === "W") g.w++; else g.l++;
    g.profit += s.profit || 0;
  }
  const records = {};
  for (const [grade, g] of Object.entries(byGrade)) {
    const n = g.w + g.l;
    if (!n) continue;
    records[grade] = { win: Math.round((100 * g.w) / n), sample: `L${n}`,
      roi: (g.profit >= 0 ? "+" : "") + g.profit.toFixed(1) + "u" };
  }
  return records;
}

// Edge attribution: per league/market record + avg CLV, so we learn where the edge lives. Pure.
export function attribution(settled) {
  const by = {};
  for (const s of settled) {
    const k = s.league || s.sport || "?";
    (by[k] ||= { w: 0, l: 0, clvSum: 0, clvN: 0, profit: 0 });
    const a = by[k];
    if (s.result === "W") a.w++; else if (s.result === "L") a.l++;
    if (typeof s.clvEdge === "number") { a.clvSum += s.clvEdge; a.clvN++; }
    a.profit += s.profit || 0;
  }
  return Object.entries(by).map(([seg, a]) => ({
    seg, record: `${a.w}-${a.l}`,
    avgClvPct: a.clvN ? Math.round((a.clvSum / a.clvN) * 1000) / 10 : null,
    profit: Math.round(a.profit * 100) / 100
  }));
}
