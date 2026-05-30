// planner.js — choose which leagues to scan this run. Anchors (our richest edge sources)
// scan every run; the international pool rotates so we cover it over successive runs while
// staying inside a per-run credit target. Free-tier friendly. Pure.
export function buildScanPlan(anchors, rotation, { activeKeys = null, rotationIndex = 0, creditTarget = 5 }) {
  const isActive = (k) => !activeKeys || activeKeys.has(k);
  const cost = (e) => e.markets.length * (e.regions ? e.regions.split(",").length : 1); // credits = markets × regions
  const plan = [];
  let credits = 0;
  for (const a of anchors) {
    if (!isActive(a.key)) continue;
    plan.push(a); credits += cost(a);
  }
  const pool = rotation.filter((r) => isActive(r.key));
  let added = 0;
  const start = pool.length ? ((rotationIndex % pool.length) + pool.length) % pool.length : 0;
  for (let n = 0; n < pool.length; n++) {
    if (credits >= creditTarget) break;
    const r = pool[(start + n) % pool.length];
    plan.push(r); credits += cost(r); added++;
  }
  const nextIndex = pool.length ? (start + added) % pool.length : 0;
  return { plan, nextIndex, credits };
}
