// American <-> decimal <-> implied probability. Pure.
export function americanToDecimal(a) {
  const n = typeof a === "string" ? parseInt(a, 10) : a;
  return n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1;
}
export function decimalToAmerican(d) {
  if (d <= 1) return 100;
  return d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
}
export function impliedFromDecimal(d) {
  return 1 / d;
}
export function formatAmerican(a) {
  const n = Math.round(a);
  return (n > 0 ? "+" : "") + n;
}
