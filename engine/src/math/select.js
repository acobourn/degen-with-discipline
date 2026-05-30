// Gates, ranking, Lock band selection, and grade mapping. Pure.
export function gradeFor(conf) {
  if (conf >= 90) return "A+";
  if (conf >= 85) return "A";
  if (conf >= 80) return "A-";
  if (conf >= 75) return "B+";
  if (conf >= 70) return "B";
  return "B-";
}

export function qualifies(c, { evThreshold, minBooks }) {
  return c.evPct >= evThreshold && c.bookCount >= minBooks;
}

// Highest EV candidate whose American odds fall within the Lock band.
export function pickLock(cands, { minAmerican, maxAmerican }) {
  const inBand = cands.filter(
    (c) => c.americanOdds >= minAmerican && c.americanOdds <= maxAmerican
  );
  if (inBand.length === 0) return null;
  return inBand.reduce((best, c) => (c.evPct > best.evPct ? c : best));
}
