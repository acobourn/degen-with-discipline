import { writeFileSync } from "node:fs";
import { CONFIG } from "../config.js";
import { fetchOdds } from "../io/oddsClient.js";
import { fetchFinals } from "../io/scores.js";
import { enrich as enrichMlb } from "../io/enrichMlb.js";
import { enrich as enrichSoccer } from "../io/enrichSoccer.js";
import { robustConsensus, passesGuards, filterCoherent } from "../math/guardrails.js";
import { evPct } from "../math/ev.js";
import { kellyStake } from "../math/kelly.js";
import { decimalToAmerican } from "../math/oddsMath.js";
import { pickLock } from "../math/select.js";
import { confirmPick } from "./confirm.js";
import { takeShort, takeLong } from "./copy.js";
import { buildPicksJson } from "./buildPicksJson.js";
import { loadStore, saveHistory, saveBankroll, summary, calibration, attribution } from "./store.js";
import { settleFinished, logRecommended } from "./settle.js";

const OUT = new URL("../../../web/picks.json", import.meta.url);

function enricherFor(sport) { return sport === "SOC" ? enrichSoccer : enrichMlb; }
function yyyymmdd(iso) { return iso ? iso.slice(0, 10).replace(/-/g, "") : null; }

// Fetch finals for every (sport, date) among open picks whose game has started.
async function gatherFinals(openPicks, nowMs) {
  if (CONFIG.demoMode) return []; // keep demo offline + deterministic
  const keys = new Set();
  for (const o of openPicks || []) {
    if (!o.commenceTime || !o.oddsSportKey) continue;
    if (new Date(o.commenceTime).getTime() > nowMs) continue; // not started yet
    keys.add(`${o.oddsSportKey}|${yyyymmdd(o.commenceTime)}`);
  }
  const finals = [];
  for (const k of keys) {
    const [sport, date] = k.split("|");
    finals.push(...(await fetchFinals(sport, date)));
  }
  return finals;
}

export async function run() {
  const store = loadStore();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // --- settle finished picks first, so today's stakes use the updated bankroll ---
  const finals = await gatherFinals(store.history.open, nowMs);
  const s = settleFinished({ history: store.history, bankroll: store.bankroll, finals, nowIso });
  let history = s.history;
  const bankrollObj = s.bankroll;
  const bankroll = bankrollObj.bankroll;
  if (s.newlySettled.length) {
    console.error(`[run] settled ${s.newlySettled.length}: ${s.newlySettled.map((x) => x.pick + "=" + x.result).join(", ")}`);
  }

  const candidates = [];
  let edgesScanned = 0;
  const sportsToScan = CONFIG.demoMode ? CONFIG.sports.slice(0, 1) : CONFIG.sports;
  for (const sp of sportsToScan) {
    let games;
    try { games = await fetchOdds(sp.key, "h2h"); }
    catch (e) { console.error(`[run] ${sp.key}: ${e.message}`); continue; }

    for (const g of games) {
      if (g.books.length < CONFIG.minBooks) continue; // book-count gate
      // game-started guard: never recommend a game that has already begun (live only)
      if (!CONFIG.demoMode && g.commence && new Date(g.commence).getTime() <= nowMs) continue;
      const enrich = enricherFor(sp.sport);
      const signal = await enrich({ home: g.home, away: g.away });

      for (let oi = 0; oi < g.outcomes.length; oi++) {
        const present = g.books.filter((b) => CONFIG.targetBooks.includes(b.key));
        if (!present.length) continue;
        const best = present.reduce((a, b) => (b.odds[oi] > a.odds[oi] ? b : a));
        const cons = robustConsensus(g.books, { excludeKey: best.key });
        if (!cons) continue;
        const fairProb = cons.fair[oi];
        const dec = best.odds[oi];
        const ev = evPct(fairProb, dec);
        edgesScanned++;
        const americanOdds = decimalToAmerican(dec);
        const cand = { evPct: ev, bookCount: cons.bookCount, dispersion: cons.dispersion, americanOdds };
        if (!passesGuards(cand, CONFIG)) continue;

        const conf = confirmPick({ evPct: ev, modelLean: signal.modelLean,
          bookCount: g.books.length, dataPoints: signal.dataPoints });
        if (!conf.fire) continue;

        const stake = kellyStake({ fairProb, offeredDecimal: dec, bankroll,
          fraction: CONFIG.kelly.fraction, maxPct: CONFIG.kelly.maxPct, uncertainty: 1 });
        const pickName = `${g.outcomes[oi]} ML`;
        const topFactor = signal.factors[0]?.label || "Market value";
        candidates.push({
          id: `${sp.key}-${g.id}-${oi}`,
          gameId: `${sp.key}-${g.id}`,
          oddsSportKey: sp.key,
          sport: sp.sport, sportLabel: sp.label, league: sp.league,
          context: `${g.away} @ ${g.home}`,
          matchup: `${g.away} vs ${g.home}`,
          homeTeam: g.home, awayTeam: g.away,
          pick: pickName, outcomeName: g.outcomes[oi], betType: "Moneyline", market: "h2h",
          americanOdds, openAmerican: americanOdds, decimalOdds: dec,
          commenceTime: g.commence,
          evPct: ev, fairProb, impliedProb: 1 / dec, bestBook: best.title,
          confidence: conf.confidence, grade: conf.grade,
          kellyStake: stake,
          // real "data points crunched": book quotes in the consensus + any enrichment data
          dataPoints: (signal.dataPoints || 0) + g.books.length * g.outcomes.length,
          factors: signal.factors,
          takeShort: takeShort({ pick: pickName, evPct: ev, topFactor }),
          takeLong: takeLong({ pick: pickName, evPct: ev, fairProb, impliedProb: 1 / dec,
            bestBook: best.title, topFactor })
        });
      }
    }
  }

  // Coherence guard: drop games where both sides look +EV (noise, not edge).
  const coherent = filterCoherent(candidates);
  // Dedupe: never surface the same bet twice — keep the best-EV copy.
  const seen = new Map();
  for (const c of coherent) {
    const k = `${c.matchup}|${c.pick}`;
    if (!seen.has(k) || c.evPct > seen.get(k).evPct) seen.set(k, c);
  }
  const unique = [...seen.values()];

  unique.sort((a, b) => b.evPct - a.evPct);
  const lock = pickLock(unique, CONFIG.lockBand);
  const board = unique.filter((c) => c !== lock).slice(0, 6);

  // --- log today's recommended picks so we can track CLV + settle them later ---
  const recommended = [lock, ...board].filter(Boolean).map((c) => ({ ...c, isLock: c === lock, stake: c.kellyStake }));
  history = logRecommended(history, recommended, nowIso);
  if (!CONFIG.demoMode) { saveHistory(history); saveBankroll(bankrollObj); }

  const sum = summary(history.settled);
  const gradeRecords = calibration(history.settled);
  const attr = attribution(history.settled);
  const record = { lockStreak: sum.lockStreak, last10: sum.last10 };
  const lastUpdated = new Date().toLocaleTimeString("en-US",
    { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";

  const out = buildPicksJson({ lock, picks: board, record, lastUpdated, edgesScanned,
    gradeRecords, summary: sum, attribution: attr });
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.error(`[run] picks.json — lock=${lock ? lock.pick : "none"}, board=${board.length}, scanned=${edgesScanned}, open=${history.open.length}, settled=${history.settled.length}`);
  return out;
}

// Allow `node src/pipeline/run.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
