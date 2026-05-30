// Opponent-adjusted, regressed-to-mean rolling form. Pure.
// values: recent metric (e.g. K's, goals). oppStrength: ~1.0 avg, >1 tougher.
// Returns { adjusted, weight } where weight is a 0-100 factor-bar value.
export function adjustedForm({ values, oppStrength, leagueMean, regressionGames = 10 }) {
  const n = values.length;
  if (n === 0) return { adjusted: leagueMean, weight: 50 };
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const opp = oppStrength?.[i] ?? 1;
    sum += values[i] * opp; // tougher opponent scales the credit up
  }
  const rawMean = sum / n;
  // regress toward leagueMean: weight = n / (n + regressionGames)
  const w = n / (n + regressionGames);
  const adjusted = w * rawMean + (1 - w) * leagueMean;
  // factor weight: how far above league mean, mapped to 50..100 (below -> <50)
  const ratio = adjusted / (leagueMean || 1);
  const weight = Math.max(0, Math.min(100, Math.round(50 * ratio + 0)));
  return { adjusted, weight };
}
