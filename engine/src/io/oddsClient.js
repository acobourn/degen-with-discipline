// The Odds API wrapper. In demo mode (no key) reads fixtures; live mode fetches
// /v4 with a credit budget. normalizeOddsResponse is the pure shaping function.
import { readFileSync } from "node:fs";
import { CONFIG } from "../config.js";

const BASE = "https://api.the-odds-api.com/v4";

// Pure: reshape raw API games into { id, commence, home, away, outcomes[], books[] }.
export function normalizeOddsResponse(raw, marketKey) {
  const games = [];
  for (const ev of raw) {
    // outcome order: away then home for h2h; for totals, Over then Under.
    let outcomes = null;
    const books = [];
    for (const bm of ev.bookmakers || []) {
      const mkt = (bm.markets || []).find((m) => m.key === marketKey);
      if (!mkt) continue;
      if (!outcomes) outcomes = mkt.outcomes.map((o) => o.name);
      const odds = outcomes.map((name) => {
        const o = mkt.outcomes.find((x) => x.name === name);
        return o ? o.price : null;
      });
      const point = mkt.outcomes[0] ? mkt.outcomes[0].point : undefined; // totals line
      if (odds.every((x) => x != null)) books.push({ key: bm.key, title: bm.title, odds, point });
    }
    if (outcomes && books.length) {
      games.push({ id: ev.id, commence: ev.commence_time, home: ev.home_team,
        away: ev.away_team, market: marketKey, outcomes, books });
    }
  }
  return games;
}

// I/O: fetch one sport+market (1 region). Returns normalized games. Budgeted by caller.
export async function fetchOdds(sportKey, marketKey, { region = "us" } = {}) {
  if (CONFIG.demoMode) {
    const raw = JSON.parse(readFileSync(new URL("../../fixtures/odds-mlb-h2h.json", import.meta.url)));
    return normalizeOddsResponse(raw, marketKey);
  }
  const url = `${BASE}/sports/${sportKey}/odds?apiKey=${CONFIG.oddsApiKey}`
    + `&regions=${region}&markets=${marketKey}&oddsFormat=decimal`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`odds api ${res.status}: ${await res.text()}`);
  const remaining = res.headers.get("x-requests-remaining");
  if (remaining) console.error(`[odds] credits remaining: ${remaining}`);
  return normalizeOddsResponse(await res.json(), marketKey);
}
