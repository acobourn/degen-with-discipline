// Fractional Kelly with a hard bankroll cap and thin-data shrink. Pure.
// uncertainty in (0,1]: 1 = full confidence in the sample, <1 shrinks the bet.
export function kellyStake({ fairProb, offeredDecimal, bankroll, fraction, maxPct, uncertainty = 1 }) {
  const b = offeredDecimal - 1;
  const fullKelly = (fairProb * offeredDecimal - 1) / b; // (bp - q)/b
  if (fullKelly <= 0) return 0;
  const frac = Math.min(fullKelly * fraction, maxPct) * uncertainty;
  return Math.round(frac * bankroll * 100) / 100;
}

// Shrink the bet when our probability estimate is shaky: few books, books disagree, or no
// sharp (Pinnacle) anchor. Returns a multiplier in [0.35, 1] for kellyStake's `uncertainty`.
export function uncertaintyMult({ bookCount = 8, dispersion = 0, sharp = false }) {
  const bookFactor = Math.min(1, (bookCount || 0) / 8);          // 8+ books = full confidence
  const dispFactor = Math.max(0.4, 1 - (dispersion || 0) / 0.10); // wide disagreement -> shrink
  const sharpFactor = sharp ? 1 : 0.7;                            // soft-consensus (no Pinnacle) -> smaller
  return Math.max(0.35, bookFactor * dispFactor * sharpFactor);
}
