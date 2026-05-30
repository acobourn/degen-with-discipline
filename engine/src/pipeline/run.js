import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CONFIG } from "../config.js";
import { fetchOdds, fetchActiveSports } from "../io/oddsClient.js";
import { fetchFinals } from "../io/scores.js";
import { buildScanPlan } from "./planner.js";
import { enrich as enrichMlb } from "../io/enrichMlb.js";
import { enrich as enrichSoccer } from "../io/enrichSoccer.js";
import { passesGuards, filterCoherent } from "../math/guardrails.js";
import { evaluateGameMarket } from "./evaluate.js";
import { evPct } from "../math/ev.js";
import { kellyStake } from "../math/kelly.js";
import { decimalToAmerican } from "../math/oddsMath.js";
import { pickLock } from "../math/select.js";
import { confirmPick } from "./confirm.js";
import { takeShort, takeLong } from "./copy.js";
import { buildPicksJson } from "./buildPicksJson.js";
import { loadStore, saveHistory, saveBankroll, summary, calibration, attribution, pausedSegments } from "./store.js";
import { settleFinished, logRecommended } from "./settle.js";
import { composeAlert, notify, anyChannelConfigured } from "../io/notify.js";

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

  // circuit-breaker: leagues whose CLV went negative are paused until they recover
  const paused = pausedSegments(history.settled);
  if (paused.size) console.error(`[run] paused (negative CLV): ${[...paused].join(", ")}`);

  // scan plan: anchor(s) every run + a rotating slice of ACTIVE international leagues,
  // budgeted to the free tier. Only active leagues are scanned (off-season costs nothing).
  const activeKeys = await fetchActiveSports();
  const { plan, nextIndex } = CONFIG.demoMode
    ? { plan: [CONFIG.scanPlan.anchors[0]], nextIndex: 0 }
    : buildScanPlan(CONFIG.scanPlan.anchors, CONFIG.scanPlan.rotation,
        { activeKeys, rotationIndex: store.bankroll.rotationIndex || 0, creditTarget: CONFIG.scanPlan.creditTarget });
  bankrollObj.rotationIndex = nextIndex;
  if (!CONFIG.demoMode) console.error(`[run] scanning: ${plan.map((p) => p.league).join(", ")}`);

  const candidates = [];
  let edgesScanned = 0;
  for (const sp of plan) {
    if (paused.has(sp.league)) continue; // circuit-breaker
    for (const market of sp.markets) {
      let games;
      try { games = await fetchOdds(sp.key, market); }
      catch (e) { console.error(`[run] ${sp.key}/${market}: ${e.message}`); continue; }

      for (const g of games) {
        if (g.books.length < CONFIG.minBooks) continue; // book-count gate
        // game-started guard: never recommend a game that has already begun (live only)
        if (!CONFIG.demoMode && g.commence && new Date(g.commence).getTime() <= nowMs) continue;
        const signal = await enricherFor(sp.sport)({ home: g.home, away: g.away, market });
        const isTotals = market === "totals";

        for (const o of evaluateGameMarket(g, { targetBooks: CONFIG.targetBooks })) {
          const ev = evPct(o.fairProb, o.bestDecimal);
          edgesScanned++;
          const americanOdds = decimalToAmerican(o.bestDecimal);
          if (!passesGuards({ evPct: ev, bookCount: o.bookCount, dispersion: o.dispersion, americanOdds }, CONFIG)) continue;

          // directional model lean (only applied when it matches this outcome's side)
          const lean = signal.leanFor ? signal.leanFor(o.side) : (signal.modelLean || 0);
          const conf = confirmPick({ evPct: ev, modelLean: lean,
            bookCount: o.bookCount, dataPoints: signal.dataPoints });
          if (!conf.fire) continue;

          const stake = kellyStake({ fairProb: o.fairProb, offeredDecimal: o.bestDecimal, bankroll,
            fraction: CONFIG.kelly.fraction, maxPct: CONFIG.kelly.maxPct, uncertainty: 1 });
          const pickName = isTotals ? o.outcomeName
            : (/^draw$/i.test(o.outcomeName) ? "Draw" : `${o.outcomeName} ML`);
          const topFactor = signal.factors[0]?.label || "Market value";
          candidates.push({
            id: `${sp.key}-${g.id}-${market}-${o.side}`,
            gameId: `${sp.key}-${g.id}-${market}`,
            oddsSportKey: sp.key,
            sport: sp.sport, sportLabel: sp.label, league: sp.league,
            context: `${g.away} @ ${g.home}`,
            matchup: `${g.away} vs ${g.home}`,
            homeTeam: g.home, awayTeam: g.away,
            pick: pickName, outcomeName: o.outcomeName, side: o.side, point: o.point,
            betType: isTotals ? "Total" : "Moneyline", market,
            americanOdds, openAmerican: americanOdds, decimalOdds: o.bestDecimal,
            commenceTime: g.commence,
            evPct: ev, fairProb: o.fairProb, impliedProb: 1 / o.bestDecimal, bestBook: o.bestTitle,
            confidence: conf.confidence, grade: conf.grade,
            kellyStake: stake,
            dataPoints: (signal.dataPoints || 0) + g.books.length * g.outcomes.length,
            factors: signal.factors,
            takeShort: takeShort({ pick: pickName, evPct: ev, topFactor }),
            takeLong: takeLong({ pick: pickName, evPct: ev, fairProb: o.fairProb,
              impliedProb: 1 / o.bestDecimal, bestBook: o.bestTitle, topFactor })
          });
        }
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

  // --- alerts: notify configured channels about FRESH edges only (no spam) ---
  if (!CONFIG.demoMode && anyChannelConfigured()) {
    const notified = new Set(history.notified || []);
    const freshLock = lock && !notified.has(lock.id) ? lock : null;
    const freshBoard = board.filter((c) => !notified.has(c.id));
    if (freshLock || freshBoard.length) {
      const msg = composeAlert({ lock: freshLock, picks: freshBoard, siteUrl: CONFIG.siteUrl });
      if (msg) {
        const sent = await notify(msg, "Degen with Discipline — fresh edge");
        console.error(`[notify] sent to ${sent.join(", ") || "nobody"}`);
        [freshLock, ...freshBoard].filter(Boolean).forEach((c) => notified.add(c.id));
        history = { ...history, notified: [...notified].slice(-200) };
      }
    }
  }

  if (!CONFIG.demoMode) { saveHistory(history); saveBankroll(bankrollObj); }

  const sum = summary(history.settled);
  const gradeRecords = calibration(history.settled);
  const attr = attribution(history.settled);
  const record = { lockStreak: sum.lockStreak, last10: sum.last10 };
  const lastUpdated = new Date().toLocaleTimeString("en-US",
    { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";

  const out = buildPicksJson({ lock, picks: board, record, lastUpdated, edgesScanned,
    gradeRecords, summary: sum, attribution: attr, bankroll });
  writeFileSync(OUT, JSON.stringify(out, null, 2));

  // --- served history.json for the track-record page (real settled results + CLV) ---
  const histRows = history.settled.map((x) => {
    const dt = x.commenceTime || x.settledAt;
    const date = dt ? new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "—";
    return { date, sport: x.sport, league: x.league, matchup: x.matchup, pick: x.pick,
      odds: (x.americanOdds > 0 ? "+" : "") + x.americanOdds, grade: x.grade, result: x.result,
      lock: !!x.isLock, clvPct: typeof x.clvEdge === "number" ? Math.round(x.clvEdge * 1000) / 10 : null };
  });
  const order = ["A+", "A", "A-", "B+", "B", "B-"];
  const gradeReliability = order.filter((gr) => gradeRecords[gr])
    .map((gr) => ({ grade: gr, pct: gradeRecords[gr].win, rec: "of " + gradeRecords[gr].sample.slice(1) + " picks" }));
  const histSports = ["ALL", ...new Set(histRows.map((r) => r.sport).filter(Boolean))];
  writeFileSync(new URL("../../../web/history.json", import.meta.url), JSON.stringify(
    { settled: histRows, gradeReliability, attribution: attr, summary: sum, bankroll, sports: histSports }, null, 2));

  console.error(`[run] picks.json — lock=${lock ? lock.pick : "none"}, board=${board.length}, scanned=${edgesScanned}, open=${history.open.length}, settled=${history.settled.length}`);
  return out;
}

// Allow `node src/pipeline/run.js` (cross-platform main-module check; the old
// `file://${argv[1]}` form silently failed on Windows paths).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
