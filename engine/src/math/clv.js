// Closing Line Value: did the price you took imply a lower win prob than the
// margin-free closing consensus? Positive edge => you beat the close. Pure.
import { impliedFromDecimal } from "./oddsMath.js";

export function clvEdge({ betDecimal, closingFairProb }) {
  return closingFairProb - impliedFromDecimal(betDecimal);
}
