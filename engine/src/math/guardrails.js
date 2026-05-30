// Safety guardrails that stop thin/noisy markets from manufacturing fake edges.
// Pure functions. Philosophy: when the market is incoherent, we sit out.
import { devigPower } from "./devig.js";

export function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return NaN;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

// Robust consensus: de-vig each book, take the MEDIAN per outcome (immune to a
// single outlier book), and report how much the books disagree (dispersion).
export function robustConsensus(books, { excludeKey = null } = {}) {
  const used = books.filter((b) => b.key !== excludeKey && Array.isArray(b.odds));
  if (used.length === 0) return null;
  const n = used[0].odds.length;
  const perBook = used.map((b) => devigPower(b.odds));
  const med = [];
  let dispersion = 0;
  for (let i = 0; i < n; i++) {
    const col = perBook.map((p) => p[i]);
    med.push(median(col));
    dispersion = Math.max(dispersion, Math.max(...col) - Math.min(...col));
  }
  const sum = med.reduce((a, b) => a + b, 0);
  const fair = med.map((x) => x / sum);
  return { fair, dispersion, bookCount: used.length };
}

// A candidate is trustworthy only if: enough books, EV in a sane window (huge EV
// = bad data), books actually agree (low dispersion), and odds aren't absurd.
export function passesGuards(c, g) {
  if (c.bookCount < g.minBooks) return false;
  if (c.evPct < g.evThreshold) return false;
  if (c.evPct > g.maxEvPct) return false;            // too good to be true
  if (c.dispersion > g.maxDispersion) return false;  // books disagree too much
  if (c.americanOdds < g.saneOdds.min || c.americanOdds > g.saneOdds.max) return false;
  return true;
}

// Drop incoherent games: if 2+ outcomes of the SAME game look +EV, the consensus
// is noise (you can't have value on both sides of a coherent market). Sit out.
export function filterCoherent(cands) {
  const byGame = new Map();
  for (const c of cands) {
    const k = c.gameId || c.matchup;
    byGame.set(k, (byGame.get(k) || 0) + 1);
  }
  return cands.filter((c) => byGame.get(c.gameId || c.matchup) === 1);
}
