// Assemble engine candidates into the exact window.DWD_* shape the UI consumes. Pure.
import { americanToDecimal, formatAmerican } from "../math/oddsMath.js";

function payoutNote(americanOdds, stake = 100) {
  const dec = americanToDecimal(americanOdds);
  return `$${stake} → $${Math.round(stake * dec)}`;
}

function toPick(c) {
  return {
    id: c.id,
    sport: c.sport,
    sportLabel: c.sportLabel,
    league: c.league,
    context: c.context,
    matchup: c.matchup,
    pick: c.pick,
    betType: c.betType,
    odds: formatAmerican(c.americanOdds),
    openOdds: c.openAmerican != null ? formatAmerican(c.openAmerican) : formatAmerican(c.americanOdds),
    payoutNote: payoutNote(c.americanOdds),
    confidence: c.confidence,
    grade: c.grade,
    takeShort: c.takeShort,
    takeLong: c.takeLong,
    dataPoints: c.dataPoints,
    factors: c.factors || [],
    // engine additions
    evPct: c.evPct,
    fairProb: c.fairProb,
    impliedProb: c.impliedProb,
    bestBook: c.bestBook,
    kellyStake: c.kellyStake
  };
}

export function buildPicksJson({ lock, picks, record, lastUpdated, edgesScanned, special = null, deskNotes }) {
  return {
    lastUpdated,
    edgesScanned,
    lock: lock ? { ...toPick(lock), isLock: true } : null,
    picks: picks.map(toPick),
    special,
    record,
    deskNotes: deskNotes || [
      "Bet the math, not the mascot.",
      "Discipline is just degeneracy with a spreadsheet.",
      "Some days the sharp play is no play. Today we hunt."
    ]
  };
}
