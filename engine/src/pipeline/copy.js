// Swaggy-but-honest takes built from the real numbers. No LLM. Pure.
const SHORTS = [
  (p) => `The market blinked on ${p.pick}. We didn't.`,
  (p) => `${p.topFactor} says go; the price says value. Rare combo.`,
  (p) => `Small edge, real edge. ${p.pick} is priced wrong and we noticed.`
];

export function takeShort(p) {
  const i = Math.abs(hash(p.pick)) % SHORTS.length;
  return SHORTS[i](p);
}

export function takeLong(p) {
  const ev = (p.evPct * 100).toFixed(1);
  const fair = Math.round(p.fairProb * 100);
  const impl = Math.round(p.impliedProb * 100);
  return `Our de-vigged consensus puts the true number at ${fair}%, but ${p.bestBook} `
    + `is pricing it like ${impl}% — a +${ev}% edge. ${p.topFactor} backs the lean, and the `
    + `sharper books agree, so this isn't a hunch, it's a mispriced line. Bet the math.`;
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
