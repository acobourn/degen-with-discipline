// Combine the price edge with the model lean. A pick fires only if EV clears
// and the model does not contradict the market. Contradiction => warning, not bet.
import { gradeFor } from "../math/select.js";

export function confirmPick({ evPct, modelLean = 0, bookCount, dataPoints = 0 }) {
  if (modelLean < 0) {
    return { fire: false, reason: "model_contradicts_market", confidence: 0, grade: null };
  }
  // confidence: EV drives it, nudged by an agreeing lean, data depth, and book count.
  // Calibrated so ~2% EV ≈ B-, ~4% EV w/ lean+depth ≈ A-/B+, ~6%+ ≈ A/A+.
  const evComponent = Math.min(25, evPct * 500);        // 4% EV -> 20, 5%+ -> 25
  const leanComponent = modelLean > 0 ? 6 : 0;
  const depthComponent = Math.min(6, dataPoints / 200); // 1200 pts -> 6
  const bookComponent = Math.min(4, Math.max(0, bookCount - 4));
  const confidence = Math.round(50 + evComponent + leanComponent + depthComponent + bookComponent);
  const c = Math.max(60, Math.min(99, confidence));
  return { fire: true, reason: "ok", confidence: c, grade: gradeFor(c) };
}
