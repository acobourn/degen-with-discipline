// MLB enrichment: opponent-adjusted recent form (L10) + probable-pitcher ERA from the
// free MLB Stats API. Produces real factor bars and a MILD, confirm-only lean — it can
// raise confidence on the side it agrees with, but never overrides the price edge.
// Always returns a signal; never throws (neutral fallback).
import { CONFIG } from "../config.js";
import { teamMatches } from "../pipeline/settle.js";

function winPct(rec) { const n = rec.w + rec.l; return n ? rec.w / n : 0.5; }

// Pure: combine form + pitcher ERA into factors + a mild lean toward the stronger side.
export function buildMlbSignal({ home, away, homeRec, awayRec, homeEra, awayEra }) {
  const factors = [];
  let dataPoints = 0, homeScore = 0, awayScore = 0;
  if (homeRec && awayRec) {
    const hp = winPct(homeRec), ap = winPct(awayRec);
    homeScore += hp - 0.5; awayScore += ap - 0.5;
    factors.push({ label: "Recent form (L10)",
      weight: Math.round(Math.max(0, Math.min(100, 50 + (Math.max(hp, ap) - 0.5) * 120))),
      note: `${away} ${awayRec.w}-${awayRec.l} · ${home} ${homeRec.w}-${homeRec.l}` });
    dataPoints += 20;
  }
  if (homeEra != null && awayEra != null) {
    const diff = awayEra - homeEra; // >0 => home's probable pitcher is better (lower ERA)
    homeScore += diff * 0.05; awayScore += -diff * 0.05;
    factors.push({ label: "Probable pitcher (ERA)",
      weight: Math.round(Math.max(0, Math.min(100, 50 + Math.abs(diff) * 8))),
      note: `${home} ${homeEra.toFixed(2)} · ${away} ${awayEra.toFixed(2)} ERA` });
    dataPoints += 12;
  }
  let leanTeam = null, modelLean = 0, strong = false;
  const gap = homeScore - awayScore;
  if (Math.abs(gap) >= 0.12) {
    leanTeam = gap > 0 ? home : away;
    modelLean = 1;
    strong = Math.abs(gap) >= 0.30; // only a STRONG mismatch suppresses the opposite side
  }
  return { modelLean, leanTeam, strong, dataPoints, factors };
}

// --- live data (cached per run; free API, no key) ---
let _sched = null, _stand = null;
const _era = new Map();
async function j(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status + " " + url); return r.json(); }

async function loadSched(date) {
  if (_sched) return _sched;
  try { _sched = await j(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=probablePitcher`); }
  catch (e) { _sched = { dates: [] }; }
  return _sched;
}
async function loadStand(season) {
  if (_stand) return _stand;
  try { _stand = await j(`https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${season}&standingsTypes=byDivision`); }
  catch (e) { _stand = { records: [] }; }
  return _stand;
}
async function eraFor(id, season) {
  if (id == null) return null;
  if (_era.has(id)) return _era.get(id);
  let v = null;
  try {
    const d = await j(`https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season&group=pitching&season=${season}`);
    const e = parseFloat(d.stats?.[0]?.splits?.[0]?.stat?.era);
    v = isNaN(e) ? null : e;
  } catch (e) { /* leave null */ }
  _era.set(id, v);
  return v;
}
function teamL10(stand, name) {
  for (const rec of stand.records || []) for (const tr of rec.teamRecords || []) {
    if (teamMatches(tr.team?.name, name)) {
      const lt = (tr.records?.splitRecords || []).find((s) => s.type === "lastTen");
      if (lt) return { w: lt.wins, l: lt.losses };
      if (tr.wins != null) return { w: tr.wins, l: tr.losses };
    }
  }
  return null;
}
function findGame(sched, home, away) {
  for (const day of sched.dates || []) for (const g of day.games || []) {
    const h = g.teams?.home?.team?.name, a = g.teams?.away?.team?.name;
    if (teamMatches(h, home) && teamMatches(a, away)) return { g, swapped: false };
    if (teamMatches(h, away) && teamMatches(a, home)) return { g, swapped: true };
  }
  return null;
}

export async function enrich({ home, away }) {
  if (CONFIG.demoMode) {
    return { modelLean: 0, dataPoints: 0, leanFor: () => 0,
      factors: [{ label: "Recent form (L10)", weight: 50, note: "demo mode — no live data" },
                { label: "Probable pitcher (ERA)", weight: 50, note: "demo mode" }] };
  }
  try {
    const date = new Date().toISOString().slice(0, 10);
    const season = date.slice(0, 4);
    const [sched, stand] = await Promise.all([loadSched(date), loadStand(season)]);
    const homeRec = teamL10(stand, home), awayRec = teamL10(stand, away);
    let homeEra = null, awayEra = null;
    const found = findGame(sched, home, away);
    if (found) {
      const t = found.g.teams;
      const schedHomeId = t.home?.probablePitcher?.id, schedAwayId = t.away?.probablePitcher?.id;
      const ourHomeId = found.swapped ? schedAwayId : schedHomeId;
      const ourAwayId = found.swapped ? schedHomeId : schedAwayId;
      [homeEra, awayEra] = await Promise.all([eraFor(ourHomeId, season), eraFor(ourAwayId, season)]);
    }
    const sig = buildMlbSignal({ home, away, homeRec, awayRec, homeEra, awayEra });
    return {
      ...sig,
      leanFor: (side) => {
        if (!sig.leanTeam) return 0;
        if (teamMatches(side, sig.leanTeam)) return 1;          // model agrees -> confidence boost
        if (/^(draw|over|under)/i.test(side)) return 0;          // totals/draw: moneyline lean N/A
        return sig.strong ? -1 : 0;                              // opposite team: suppress only if strong
      }
    };
  } catch (e) {
    console.error("[enrichMlb] " + e.message);
    return { modelLean: 0, dataPoints: 0, factors: [], leanFor: () => 0 };
  }
}
