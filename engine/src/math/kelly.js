// Fractional Kelly with a hard bankroll cap and thin-data shrink. Pure.
// uncertainty in (0,1]: 1 = full confidence in the sample, <1 shrinks the bet.
export function kellyStake({ fairProb, offeredDecimal, bankroll, fraction, maxPct, uncertainty = 1 }) {
  const b = offeredDecimal - 1;
  const fullKelly = (fairProb * offeredDecimal - 1) / b; // (bp - q)/b
  if (fullKelly <= 0) return 0;
  const frac = Math.min(fullKelly * fraction, maxPct) * uncertainty;
  return Math.round(frac * bankroll * 100) / 100;
}
