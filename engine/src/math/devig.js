// De-vig a single book's market with the power method, then build a
// margin-free consensus across books (excluding the book we might bet). Pure.
import { impliedFromDecimal } from "./oddsMath.js";

// Power method: find exponent n>=1 such that sum(impl_i^n) == 1, fair = impl_i^n.
export function devigPower(decimalOdds) {
  const impl = decimalOdds.map(impliedFromDecimal);
  const sum0 = impl.reduce((a, b) => a + b, 0);
  if (sum0 <= 1) return impl.map((p) => p / sum0); // no margin -> proportional
  let lo = 1, hi = 8;
  const sumPow = (n) => impl.reduce((a, p) => a + Math.pow(p, n), 0);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (sumPow(mid) > 1) lo = mid; else hi = mid;
  }
  const n = (lo + hi) / 2;
  const fair = impl.map((p) => Math.pow(p, n));
  const s = fair.reduce((a, b) => a + b, 0);
  return fair.map((p) => p / s); // normalize against tiny solver error
}

// books: [{ key, odds:[dec,...], weight? }]. Returns consensus fair probs per outcome.
export function consensusFairProb(books, { excludeKey = null, weights = {} } = {}) {
  const used = books.filter((b) => b.key !== excludeKey && Array.isArray(b.odds));
  if (used.length === 0) return null;
  const n = used[0].odds.length;
  const acc = new Array(n).fill(0);
  let wsum = 0;
  for (const b of used) {
    const fair = devigPower(b.odds);
    const w = weights[b.key] ?? 1;
    for (let i = 0; i < n; i++) acc[i] += fair[i] * w;
    wsum += w;
  }
  const avg = acc.map((x) => x / wsum);
  const s = avg.reduce((a, b) => a + b, 0);
  return avg.map((x) => x / s);
}
