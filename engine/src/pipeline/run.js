import { writeFileSync } from "node:fs";
import { CONFIG } from "../config.js";
import { fetchOdds } from "../io/oddsClient.js";
import { enrich as enrichMlb } from "../io/enrichMlb.js";
import { enrich as enrichSoccer } from "../io/enrichSoccer.js";
import { consensusFairProb } from "../math/devig.js";
import { evPct } from "../math/ev.js";
import { kellyStake } from "../math/kelly.js";
import { decimalToAmerican } from "../math/oddsMath.js";
import { qualifies, pickLock } from "../math/select.js";
import { confirmPick } from "./confirm.js";
import { takeShort, takeLong } from "./copy.js";
import { buildPicksJson } from "./buildPicksJson.js";
import { loadStore, recordToSummary } from "./store.js";

const OUT = new URL("../../../web/picks.json", import.meta.url);

function enricherFor(sport) { return sport === "SOC" ? enrichSoccer : enrichMlb; }

export async function run() {
  const store = loadStore();
  const bankroll = store.bankroll.bankroll;
  const candidates = [];
  let edgesScanned = 0;

  // In demo mode every sport returns the same fixture; scan one to avoid dupes.
  const sportsToScan = CONFIG.demoMode ? CONFIG.sports.slice(0, 1) : CONFIG.sports;
  for (const s of sportsToScan) {
    let games;
    try { games = await fetchOdds(s.key, "h2h"); }
    catch (e) { console.error(`[run] ${s.key}: ${e.message}`); continue; }

    for (const g of games) {
      if (g.books.length < CONFIG.minBooks) continue; // book-count gate
      const enrich = enricherFor(s.sport);
      const signal = await enrich({ home: g.home, away: g.away });

      // Evaluate each outcome at its best target-book price vs consensus (book excluded).
      for (let oi = 0; oi < g.outcomes.length; oi++) {
        const present = g.books.filter((b) => CONFIG.targetBooks.includes(b.key));
        if (!present.length) continue;
        const best = present.reduce((a, b) => (b.odds[oi] > a.odds[oi] ? b : a));
        const fair = consensusFairProb(g.books, { excludeKey: best.key });
        if (!fair) continue;
        const fairProb = fair[oi];
        const dec = best.odds[oi];
        const ev = evPct(fairProb, dec);
        edgesScanned++;
        const americanOdds = decimalToAmerican(dec);
        const cand = { evPct: ev, bookCount: g.books.length, americanOdds };
        if (!qualifies(cand, CONFIG)) continue;

        const conf = confirmPick({ evPct: ev, modelLean: signal.modelLean,
          bookCount: g.books.length, dataPoints: signal.dataPoints });
        if (!conf.fire) continue;

        const stake = kellyStake({ fairProb, offeredDecimal: dec, bankroll,
          fraction: CONFIG.kelly.fraction, maxPct: CONFIG.kelly.maxPct, uncertainty: 1 });
        const pickName = `${g.outcomes[oi]} ML`;
        const topFactor = signal.factors[0]?.label || "Market value";
        candidates.push({
          id: `${s.key}-${g.id}-${oi}`,
          sport: s.sport, sportLabel: s.label, league: s.league,
          context: `${g.away} @ ${g.home}`,
          matchup: `${g.away} vs ${g.home}`,
          pick: pickName, betType: "Moneyline",
          americanOdds, openAmerican: americanOdds,
          evPct: ev, fairProb, impliedProb: 1 / dec, bestBook: best.title,
          confidence: conf.confidence, grade: conf.grade,
          kellyStake: stake, dataPoints: signal.dataPoints || 0,
          factors: signal.factors,
          takeShort: takeShort({ pick: pickName, evPct: ev, topFactor }),
          takeLong: takeLong({ pick: pickName, evPct: ev, fairProb, impliedProb: 1 / dec,
            bestBook: best.title, topFactor })
        });
      }
    }
  }

  // Dedupe: never surface the same bet twice — keep the best-EV copy.
  const seen = new Map();
  for (const c of candidates) {
    const k = `${c.matchup}|${c.pick}`;
    if (!seen.has(k) || c.evPct > seen.get(k).evPct) seen.set(k, c);
  }
  const unique = [...seen.values()];

  unique.sort((a, b) => b.evPct - a.evPct);
  const lock = pickLock(unique, CONFIG.lockBand);
  const board = unique.filter((c) => c !== lock).slice(0, 6);
  const record = recordToSummary(store.history);
  const lastUpdated = new Date().toLocaleTimeString("en-US",
    { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";

  const out = buildPicksJson({ lock, picks: board, record, lastUpdated, edgesScanned });
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.error(`[run] wrote picks.json — lock=${lock ? lock.pick : "none"}, board=${board.length}, scanned=${edgesScanned}`);
  return out;
}

// Allow `node src/pipeline/run.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
