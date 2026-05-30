// evaluate.js — turn a normalized game+market into per-outcome candidates with a SHARP
// fair value. When a sharp book (Pinnacle / Betfair / Matchbook, via the eu region) is
// present we anchor "true probability" on it — that is the real edge: bet a soft book
// (DK/Bet365) only when it beats the SHARP no-vig line. Falls back to the de-vigged
// soft consensus (lower confidence) only where no sharp book is available. Pure.
import { robustConsensus } from "../math/guardrails.js";

export function evaluateGameMarket(game, { targetBooks, sharpBooks = [] }) {
  return evalGrouped(game, targetBooks, sharpBooks, game.market === "totals");
}

// Fair value: anchor on sharp books if any are present; else soft-consensus fallback.
// dispersion = disagreement among the books actually used (≈0 for a single sharp like Pinnacle,
// which we trust; market-wide disagreement among soft books in the fallback case).
function fairValue(books, sharpBooks, excludeKey) {
  const all = books.filter((b) => Array.isArray(b.odds));
  if (!all.length) return null;
  const sharps = all.filter((b) => sharpBooks.includes(b.key));
  const fairR = sharps.length ? robustConsensus(sharps, {}) : robustConsensus(all, { excludeKey });
  if (!fairR) return null;
  return { fair: fairR.fair, sharp: sharps.length > 0, sharpCount: sharps.length, dispersion: fairR.dispersion };
}

function evalGrouped(game, targetBooks, sharpBooks, isTotals) {
  let books = game.books;
  let pointLabel = null;
  if (isTotals) {
    // group books by their total line; consensus line = the one most books offer
    const byPoint = new Map();
    for (const b of game.books) {
      if (b.point == null) continue;
      const arr = byPoint.get(b.point) || [];
      arr.push(b); byPoint.set(b.point, arr);
    }
    if (!byPoint.size) return [];
    let bestArr = [];
    for (const [pt, arr] of byPoint) if (arr.length > bestArr.length) { pointLabel = pt; bestArr = arr; }
    books = bestArr;
  }
  const out = [];
  for (let oi = 0; oi < game.outcomes.length; oi++) {
    const present = books.filter((b) => targetBooks.includes(b.key)); // soft books we'd actually bet
    if (!present.length) continue;
    const best = present.reduce((a, b) => (b.odds[oi] > a.odds[oi] ? b : a));
    const fv = fairValue(books, sharpBooks, best.key);
    if (!fv) continue;
    const name = isTotals ? `${game.outcomes[oi]} ${pointLabel}` : game.outcomes[oi];
    out.push({
      outcomeName: name, side: game.outcomes[oi], point: pointLabel,
      bestKey: best.key, bestTitle: best.title, bestDecimal: best.odds[oi],
      fairProb: fv.fair[oi], dispersion: fv.dispersion, bookCount: books.length,
      sharp: fv.sharp, sharpCount: fv.sharpCount
    });
  }
  return out;
}
