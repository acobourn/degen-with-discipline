// boost.js — promo / odds-boost evaluator. For a small bankroll, boosts (odds boosts,
// "boost A to B", profit boosts) are often the single biggest +EV source. Pure math;
// the boost.html calculator mirrors these exact formulas client-side.
import { americanToDecimal, impliedFromDecimal } from "../math/oddsMath.js";
import { kellyStake } from "../math/kelly.js";

// Fair win prob for one leg from its market (consensus) American odds, with a light
// vig haircut so we don't overstate the edge (single-side de-vig approximation).
export function legFairProb(marketAmerican, assumedHold = 0.045) {
  const raw = impliedFromDecimal(americanToDecimal(marketAmerican));
  return raw / (1 + assumedHold);
}

// Turn an original price into a profit-boosted DECIMAL price (e.g. "30% profit boost").
export function applyProfitBoost(originalAmerican, boostPct) {
  const d = americanToDecimal(originalAmerican);
  return 1 + (d - 1) * (1 + boostPct / 100);
}

// Evaluate a boosted (single- or multi-leg) bet.
// legs: [{ marketAmerican, boostedAmerican }] → combined fair prob, boosted decimal,
// EV%, and a plain-English verdict. assumedHold tunes how conservative the fair est. is.
export function evaluateBoost(legs, { assumedHold = 0.045 } = {}) {
  let fairProb = 1, boostedDecimal = 1;
  for (const l of legs) {
    fairProb *= legFairProb(l.marketAmerican, assumedHold);
    boostedDecimal *= americanToDecimal(l.boostedAmerican);
  }
  const evPct = fairProb * boostedDecimal - 1;
  let verdict;
  if (evPct >= 0.05) verdict = "STRONG — take it";
  else if (evPct >= 0.01) verdict = "+EV — worth it";
  else if (evPct >= -0.01) verdict = "coin flip — optional";
  else verdict = "SKIP — still -EV";
  return { fairProb, boostedDecimal, evPct, verdict };
}

// Suggested stake for a boosted bet (¼-Kelly capped), given the live bankroll.
export function boostStake(fairProb, boostedDecimal, bankroll, { fraction = 0.25, maxPct = 0.03 } = {}) {
  return kellyStake({ fairProb, offeredDecimal: boostedDecimal, bankroll, fraction, maxPct, uncertainty: 1 });
}
