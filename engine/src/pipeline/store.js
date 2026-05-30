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
