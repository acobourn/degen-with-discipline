// Expected value of a bet given fair win prob and the offered decimal odds. Pure.
export function evPct(fairProb, offeredDecimal) {
  return fairProb * offeredDecimal - 1;
}
