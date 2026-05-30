// evaluate.js — turn a normalized game+market into per-outcome candidates with consensus
// fair value, dispersion, and the best target-book price. Handles moneyline (h2h) and
// totals (over/under, grouped by the shared line). Pure.
import { robustConsensus } from "../math/guardrails.js";

export function evaluateGameMarket(game, { targetBooks }) {
  return evalGrouped(game, targetBooks, game.market === "totals");
}

function evalGrouped(game, targetBooks, isTotals) {
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
    const present = books.filter((b) => targetBooks.includes(b.key));
    if (!present.length) continue;
    const best = present.reduce((a, b) => (b.odds[oi] > a.odds[oi] ? b : a));
    const cons = robustConsensus(books, { excludeKey: best.key });
    if (!cons) continue;
    const name = isTotals ? `${game.outcomes[oi]} ${pointLabel}` : game.outcomes[oi];
    out.push({
      outcomeName: name, side: game.outcomes[oi], point: pointLabel,
      bestKey: best.key, bestTitle: best.title, bestDecimal: best.odds[oi],
      fairProb: cons.fair[oi], dispersion: cons.dispersion, bookCount: cons.bookCount
    });
  }
  return out;
}
