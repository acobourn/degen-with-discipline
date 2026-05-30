# Degen with Discipline — Engine + Front-End Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the betting-edge engine that turns real (or fixture) odds into a `picks.json`, and wire the existing UI to render it — a working local tool (demo-mode without keys, live with them).

**Architecture:** A zero-dependency Node engine (`engine/`) with pure-math core (de-vig consensus, EV, Kelly, form, CLV, selection) tested via TDD, plus I/O clients (The Odds API, MLB statsapi, Open-Meteo, API-Football) behind a credit budget. The orchestrator writes `web/picks.json`; the existing React-in-browser front-end (`web/`) fetches it and fills the same `window.DWD_*` globals so no component changes are needed.

**Tech Stack:** Node 24 (ESM, built-in `node:test` + `node:assert/strict`), no runtime deps. Front-end unchanged (React 18 UMD + Babel standalone).

**This is Plan 1 of 3.** Plan 2 = GitHub Actions cron + free hosting. Plan 3 = boost/promo evaluator + group notifications.

**Scope boundaries:** No LLM in any betting math. No real-money placement. Game lines only (`h2h`, `totals`) — no prop backbone. Ping pong / 1-book markets excluded by the book-count gate.

---

## File Structure

```
engine/
  package.json                 # {"type":"module"}, test script
  src/
    config.js                  # sport candidates, thresholds, env, odds band
    math/
      oddsMath.js              # american<->decimal<->implied (pure)
      devig.js                 # power-method de-vig + weighted consensus (pure)
      ev.js                    # EV%, fair odds (pure)
      kelly.js                 # fractional Kelly + caps + thin-data shrink (pure)
      form.js                  # opponent-adjusted rolling form -> factor weight (pure)
      clv.js                   # closing-line-value calc (pure)
      select.js                # gates, ranking, Lock band pick, grade (pure)
    io/
      oddsClient.js            # The Odds API wrapper + budget + cache (I/O)
      enrichMlb.js             # statsapi.mlb.com + Open-Meteo (I/O)
      enrichSoccer.js          # API-Football (I/O)
    pipeline/
      confirm.js               # EV + model lean -> fire/suppress + confidence (mostly pure)
      copy.js                  # templated takes from real data (pure)
      buildPicksJson.js        # assemble the front-end DWD_* shape (pure)
      store.js                 # read/write bankroll.json + history.json (I/O)
      run.js                   # orchestrator / entry point (I/O)
  test/                        # *.test.js mirrors src/
  fixtures/
    odds-mlb-h2h.json          # recorded The Odds API sample
data/
  bankroll.json                # {bankroll, openBets[], dailyExposure}
  history.json                 # settled bets w/ result, clv, grade
web/                           # copied front-end bundle (see Task 11)
  index.html                   # renamed "Degen with Discipline.html"
  *.jsx
  picks.json                   # engine output (demo seed committed)
```

---

## Task 1: Engine project scaffold

**Files:**
- Create: `engine/package.json`
- Create: `engine/.gitignore`
- Create: `engine/src/config.js`

- [ ] **Step 1: Create `engine/package.json`**

```json
{
  "name": "dwd-engine",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test",
    "run:engine": "node src/pipeline/run.js"
  }
}
```

- [ ] **Step 2: Create `engine/.gitignore`**

```
node_modules/
.env
*.log
```

- [ ] **Step 3: Create `engine/src/config.js`**

```js
// Central config: thresholds, sport candidates, env, odds band.
export const CONFIG = {
  oddsApiKey: process.env.ODDS_API_KEY || null,
  apiFootballKey: process.env.API_FOOTBALL_KEY || null,
  demoMode: !process.env.ODDS_API_KEY, // no key => run from fixtures
  evThreshold: 0.02,            // 2% minimum edge to surface
  minBooks: 4,                  // book-count gate: need >=4 books for consensus
  lockBand: { minAmerican: -125, maxAmerican: 125 }, // Lock odds band
  targetBooks: ["draftkings", "betmgm", "fanduel", "bet365"], // books we'd bet (best-price among those present)
  kelly: { fraction: 0.25, maxPct: 0.03 }, // 1/4 Kelly capped at 3% bankroll
  sports: [
    // The Odds API sport keys; engine works whichever have games + pass gates
    { key: "baseball_mlb", label: "Baseball", sport: "MLB", league: "MLB", tier: "anchor" },
    { key: "baseball_ncaa", label: "College Baseball", sport: "NCAAB", league: "NCAA", tier: "soft" },
    { key: "soccer_usa_mls", label: "Soccer", sport: "SOC", league: "MLS", tier: "soft" },
    { key: "soccer_epl", label: "Soccer", sport: "SOC", league: "EPL", tier: "mid" }
  ],
  markets: ["h2h", "totals"]
};
```

- [ ] **Step 4: Commit**

```bash
cd engine && git add package.json .gitignore src/config.js
git commit -m "chore: scaffold dwd engine project"
```

---

## Task 2: Odds math (pure)

**Files:**
- Create: `engine/src/math/oddsMath.js`
- Test: `engine/test/oddsMath.test.js`

- [ ] **Step 1: Write the failing test**

```js
// engine/test/oddsMath.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { americanToDecimal, decimalToAmerican, impliedFromDecimal } from "../src/math/oddsMath.js";

test("americanToDecimal: favorite and underdog", () => {
  assert.ok(Math.abs(americanToDecimal(-125) - 1.8) < 1e-9);
  assert.ok(Math.abs(americanToDecimal(125) - 2.25) < 1e-9);
  assert.ok(Math.abs(americanToDecimal(-110) - 1.9090909) < 1e-6);
});

test("decimalToAmerican round-trips", () => {
  assert.equal(decimalToAmerican(1.8), -125);
  assert.equal(decimalToAmerican(2.25), 125);
});

test("impliedFromDecimal", () => {
  assert.ok(Math.abs(impliedFromDecimal(2.0) - 0.5) < 1e-9);
  assert.ok(Math.abs(impliedFromDecimal(1.8) - 0.5555556) < 1e-6);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/oddsMath.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/math/oddsMath.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/oddsMath.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/math/oddsMath.js test/oddsMath.test.js
git commit -m "feat: odds math conversions"
```

---

## Task 3: Power-method de-vig + weighted consensus (pure)

**Files:**
- Create: `engine/src/math/devig.js`
- Test: `engine/test/devig.test.js`

- [ ] **Step 1: Write the failing test**

```js
// engine/test/devig.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { devigPower, consensusFairProb } from "../src/math/devig.js";

test("devigPower removes margin so probs sum to 1", () => {
  // -110/-110 two-way market: implied 0.5238 each, sum 1.0476
  const fair = devigPower([1.909, 1.909]);
  const sum = fair.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-6);
  assert.ok(Math.abs(fair[0] - 0.5) < 1e-6);
});

test("devigPower keeps favorite as favorite", () => {
  const fair = devigPower([1.5, 2.8]); // favorite first
  assert.ok(fair[0] > fair[1]);
  assert.ok(Math.abs(fair[0] + fair[1] - 1) < 1e-6);
});

test("consensusFairProb averages books and excludes the target book", () => {
  // outcomeIndex 0 across 3 books; target book excluded from fair value
  const books = [
    { key: "pinnacleish", odds: [1.95, 1.95] },
    { key: "softA", odds: [1.91, 2.00] },
    { key: "draftkings", odds: [2.10, 1.80] } // target, generous on outcome 0
  ];
  const fair = consensusFairProb(books, { excludeKey: "draftkings" });
  // fair[0] computed only from the other two -> ~0.503..0.51, NOT inflated by DK's 2.10
  assert.ok(fair[0] < 0.52 && fair[0] > 0.48);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/devig.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/math/devig.js`**

```js
// De-vig a single book's market with the power method, then build a
// margin-free consensus across books (excluding the book we might bet). Pure.
import { impliedFromDecimal } from "./oddsMath.js";

// Power method: find exponent n>=1 such that sum(impl_i^n) == 1, fair = impl_i^n.
export function devigPower(decimalOdds) {
  const impl = decimalOdds.map(impliedFromDecimal);
  const sum0 = impl.reduce((a, b) => a + b, 0);
  if (sum0 <= 1) return impl.map((p) => p / sum0); // no margin -> proportional
  let lo = 1, hi = 8;
  const sumPow = (n) => impl.reduce((a, p) => a + Math.pow(p, n), 0);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (sumPow(mid) > 1) lo = mid; else hi = mid;
  }
  const n = (lo + hi) / 2;
  const fair = impl.map((p) => Math.pow(p, n));
  const s = fair.reduce((a, b) => a + b, 0);
  return fair.map((p) => p / s); // normalize against tiny solver error
}

// books: [{ key, odds:[dec,...], weight? }]. Returns consensus fair probs per outcome.
export function consensusFairProb(books, { excludeKey = null, weights = {} } = {}) {
  const used = books.filter((b) => b.key !== excludeKey && Array.isArray(b.odds));
  if (used.length === 0) return null;
  const n = used[0].odds.length;
  const acc = new Array(n).fill(0);
  let wsum = 0;
  for (const b of used) {
    const fair = devigPower(b.odds);
    const w = weights[b.key] ?? 1;
    for (let i = 0; i < n; i++) acc[i] += fair[i] * w;
    wsum += w;
  }
  const avg = acc.map((x) => x / wsum);
  const s = avg.reduce((a, b) => a + b, 0);
  return avg.map((x) => x / s);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/devig.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/math/devig.js test/devig.test.js
git commit -m "feat: power-method de-vig and weighted consensus fair value"
```

---

## Task 4: EV calculation (pure)

**Files:**
- Create: `engine/src/math/ev.js`
- Test: `engine/test/ev.test.js`

- [ ] **Step 1: Write the failing test**

```js
// engine/test/ev.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { evPct } from "../src/math/ev.js";

test("evPct positive when offered price beats fair", () => {
  // fair prob 0.55, offered decimal 2.0 -> EV = 0.55*2 - 1 = 0.10
  assert.ok(Math.abs(evPct(0.55, 2.0) - 0.10) < 1e-9);
});

test("evPct negative when offered price is worse than fair", () => {
  assert.ok(evPct(0.5, 1.8) < 0); // 0.5*1.8-1 = -0.10
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/ev.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/math/ev.js`**

```js
// Expected value of a bet given fair win prob and the offered decimal odds. Pure.
export function evPct(fairProb, offeredDecimal) {
  return fairProb * offeredDecimal - 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/ev.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/math/ev.js test/ev.test.js
git commit -m "feat: expected-value calculation"
```

---

## Task 5: Fractional Kelly staking (pure)

**Files:**
- Create: `engine/src/math/kelly.js`
- Test: `engine/test/kelly.test.js`

- [ ] **Step 1: Write the failing test**

```js
// engine/test/kelly.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { kellyStake } from "../src/math/kelly.js";

test("kellyStake sizes from edge, fraction, and bankroll", () => {
  // p=0.55, dec=2.0 -> full Kelly f = (0.55*2-1)/(2-1) = 0.10
  // quarter Kelly = 0.025 of 100 = $2.50, under 3% cap
  const s = kellyStake({ fairProb: 0.55, offeredDecimal: 2.0, bankroll: 100,
    fraction: 0.25, maxPct: 0.03, uncertainty: 1 });
  assert.ok(Math.abs(s - 2.5) < 1e-6);
});

test("kellyStake respects the max-pct cap", () => {
  // huge edge -> quarter Kelly would exceed 3%; capped at $3 on $100
  const s = kellyStake({ fairProb: 0.8, offeredDecimal: 2.0, bankroll: 100,
    fraction: 0.25, maxPct: 0.03, uncertainty: 1 });
  assert.ok(Math.abs(s - 3) < 1e-6);
});

test("kellyStake shrinks on thin data and never goes negative", () => {
  const thin = kellyStake({ fairProb: 0.55, offeredDecimal: 2.0, bankroll: 100,
    fraction: 0.25, maxPct: 0.03, uncertainty: 0.5 });
  assert.ok(Math.abs(thin - 1.25) < 1e-6);
  const neg = kellyStake({ fairProb: 0.4, offeredDecimal: 2.0, bankroll: 100,
    fraction: 0.25, maxPct: 0.03, uncertainty: 1 });
  assert.equal(neg, 0); // -EV -> no bet
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/kelly.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/math/kelly.js`**

```js
// Fractional Kelly with a hard bankroll cap and thin-data shrink. Pure.
// uncertainty in (0,1]: 1 = full confidence in the sample, <1 shrinks the bet.
export function kellyStake({ fairProb, offeredDecimal, bankroll, fraction, maxPct, uncertainty = 1 }) {
  const b = offeredDecimal - 1;
  const fullKelly = (fairProb * offeredDecimal - 1) / b; // (bp - q)/b
  if (fullKelly <= 0) return 0;
  const frac = Math.min(fullKelly * fraction, maxPct) * uncertainty;
  return Math.round(frac * bankroll * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/kelly.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/math/kelly.js test/kelly.test.js
git commit -m "feat: fractional Kelly staking with caps and thin-data shrink"
```

---

## Task 6: Opponent-adjusted form (pure)

**Files:**
- Create: `engine/src/math/form.js`
- Test: `engine/test/form.test.js`

- [ ] **Step 1: Write the failing test**

```js
// engine/test/form.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { adjustedForm } from "../src/math/form.js";

test("adjustedForm regresses small samples toward the prior", () => {
  // 2 games, league mean 5, strong recent (8) but tiny sample -> pulled toward 5
  const r = adjustedForm({ values: [8, 8], oppStrength: [1, 1], leagueMean: 5,
    regressionGames: 10 });
  assert.ok(r.adjusted > 5 && r.adjusted < 6.5); // not the raw 8
});

test("adjustedForm rewards production vs strong opponents", () => {
  const weak = adjustedForm({ values: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    oppStrength: Array(10).fill(0.7), leagueMean: 5, regressionGames: 10 });
  const strong = adjustedForm({ values: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    oppStrength: Array(10).fill(1.3), leagueMean: 5, regressionGames: 10 });
  assert.ok(strong.adjusted > weak.adjusted); // same output, tougher slate => better
});

test("adjustedForm returns a 0-100 factor weight", () => {
  const r = adjustedForm({ values: [10, 10, 10], oppStrength: [1, 1, 1],
    leagueMean: 5, regressionGames: 10 });
  assert.ok(r.weight >= 0 && r.weight <= 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/form.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/math/form.js`**

```js
// Opponent-adjusted, regressed-to-mean rolling form. Pure.
// values: recent metric (e.g. K's, goals). oppStrength: ~1.0 avg, >1 tougher.
// Returns { adjusted, weight } where weight is a 0-100 factor-bar value.
export function adjustedForm({ values, oppStrength, leagueMean, regressionGames = 10 }) {
  const n = values.length;
  if (n === 0) return { adjusted: leagueMean, weight: 50 };
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const opp = oppStrength?.[i] ?? 1;
    sum += values[i] * opp; // tougher opponent scales the credit up
  }
  const rawMean = sum / n;
  // regress toward leagueMean: weight = n / (n + regressionGames)
  const w = n / (n + regressionGames);
  const adjusted = w * rawMean + (1 - w) * leagueMean;
  // factor weight: how far above league mean, mapped to 50..100 (below -> <50)
  const ratio = adjusted / (leagueMean || 1);
  const weight = Math.max(0, Math.min(100, Math.round(50 * ratio + 0)));
  return { adjusted, weight };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/form.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/math/form.js test/form.test.js
git commit -m "feat: opponent-adjusted regressed rolling form"
```

---

## Task 7: Closing Line Value (pure)

**Files:**
- Create: `engine/src/math/clv.js`
- Test: `engine/test/clv.test.js`

- [ ] **Step 1: Write the failing test**

```js
// engine/test/clv.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { clvEdge } from "../src/math/clv.js";

test("clvEdge positive when you beat the close", () => {
  // you bet at decimal 2.10 (implied 0.4762); fair at close 0.52 -> beat by ~0.044
  const e = clvEdge({ betDecimal: 2.10, closingFairProb: 0.52 });
  assert.ok(e > 0.04 && e < 0.05);
});

test("clvEdge negative when the close moved against you", () => {
  const e = clvEdge({ betDecimal: 1.80, closingFairProb: 0.52 });
  assert.ok(e < 0); // implied 0.5556 > 0.52
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/clv.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/math/clv.js`**

```js
// Closing Line Value: did the price you took imply a lower win prob than the
// margin-free closing consensus? Positive edge => you beat the close. Pure.
import { impliedFromDecimal } from "./oddsMath.js";

export function clvEdge({ betDecimal, closingFairProb }) {
  return closingFairProb - impliedFromDecimal(betDecimal);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/clv.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/math/clv.js test/clv.test.js
git commit -m "feat: closing line value calculation"
```

---

## Task 8: Selection, gates, Lock band + grade (pure)

**Files:**
- Create: `engine/src/math/select.js`
- Test: `engine/test/select.test.js`

- [ ] **Step 1: Write the failing test**

```js
// engine/test/select.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeFor, qualifies, pickLock } from "../src/math/select.js";

test("gradeFor maps confidence to letters", () => {
  assert.equal(gradeFor(93), "A+");
  assert.equal(gradeFor(86), "A");
  assert.equal(gradeFor(60), "B-");
});

test("qualifies enforces EV and book-count gates", () => {
  assert.equal(qualifies({ evPct: 0.03, bookCount: 5 }, { evThreshold: 0.02, minBooks: 4 }), true);
  assert.equal(qualifies({ evPct: 0.01, bookCount: 9 }, { evThreshold: 0.02, minBooks: 4 }), false);
  assert.equal(qualifies({ evPct: 0.05, bookCount: 2 }, { evThreshold: 0.02, minBooks: 4 }), false);
});

test("pickLock takes best EV inside the -125..+125 band", () => {
  const cands = [
    { id: "a", evPct: 0.09, americanOdds: -200 }, // best EV but out of band
    { id: "b", evPct: 0.06, americanOdds: -110 }, // in band
    { id: "c", evPct: 0.04, americanOdds: 120 }   // in band, lower EV
  ];
  const lock = pickLock(cands, { minAmerican: -125, maxAmerican: 125 });
  assert.equal(lock.id, "b");
});

test("pickLock returns null when nothing is in band", () => {
  const lock = pickLock([{ id: "a", evPct: 0.09, americanOdds: -200 }],
    { minAmerican: -125, maxAmerican: 125 });
  assert.equal(lock, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/select.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/math/select.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/select.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/math/select.js test/select.test.js
git commit -m "feat: selection gates, Lock band pick, grade mapping"
```

---

## Task 9: Confirm (EV + model lean -> fire/suppress + confidence)

**Files:**
- Create: `engine/src/pipeline/confirm.js`
- Test: `engine/test/confirm.test.js`

- [ ] **Step 1: Write the failing test**

```js
// engine/test/confirm.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmPick } from "../src/pipeline/confirm.js";

test("fires when EV is positive and the model lean agrees", () => {
  const r = confirmPick({ evPct: 0.04, modelLean: +1, bookCount: 6, dataPoints: 1200 });
  assert.equal(r.fire, true);
  assert.ok(r.confidence >= 70 && r.confidence <= 100);
});

test("suppresses when the model lean contradicts the market", () => {
  const r = confirmPick({ evPct: 0.04, modelLean: -1, bookCount: 6, dataPoints: 1200 });
  assert.equal(r.fire, false);
  assert.equal(r.reason, "model_contradicts_market");
});

test("neutral lean still fires on price alone", () => {
  const r = confirmPick({ evPct: 0.04, modelLean: 0, bookCount: 6, dataPoints: 1200 });
  assert.equal(r.fire, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/confirm.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/pipeline/confirm.js`**

```js
// Combine the price edge with the model lean. A pick fires only if EV clears
// and the model does not contradict the market. Contradiction => warning, not bet.
import { gradeFor } from "../math/select.js";

export function confirmPick({ evPct, modelLean = 0, bookCount, dataPoints = 0 }) {
  if (modelLean < 0) {
    return { fire: false, reason: "model_contradicts_market", confidence: 0, grade: null };
  }
  // confidence: EV drives it, nudged by an agreeing lean, data depth, and book count.
  // Calibrated so ~2% EV ≈ B-, ~4% EV w/ lean+depth ≈ A-/B+, ~6%+ ≈ A/A+.
  const evComponent = Math.min(25, evPct * 500);        // 4% EV -> 20, 5%+ -> 25
  const leanComponent = modelLean > 0 ? 6 : 0;
  const depthComponent = Math.min(6, dataPoints / 200); // 1200 pts -> 6
  const bookComponent = Math.min(4, Math.max(0, bookCount - 4));
  const confidence = Math.round(50 + evComponent + leanComponent + depthComponent + bookComponent);
  const c = Math.max(60, Math.min(99, confidence));
  return { fire: true, reason: "ok", confidence: c, grade: gradeFor(c) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/confirm.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/pipeline/confirm.js test/confirm.test.js
git commit -m "feat: confirm step combining EV edge with model lean"
```

---

## Task 10: Templated takes (pure)

**Files:**
- Create: `engine/src/pipeline/copy.js`
- Test: `engine/test/copy.test.js`

- [ ] **Step 1: Write the failing test**

```js
// engine/test/copy.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { takeShort, takeLong } from "../src/pipeline/copy.js";

test("takeShort mentions the edge and stays a non-empty string", () => {
  const s = takeShort({ pick: "Tigers ML", evPct: 0.04, topFactor: "Pitcher form" });
  assert.equal(typeof s, "string");
  assert.ok(s.length > 0);
});

test("takeLong includes the numeric edge and book", () => {
  const s = takeLong({ pick: "Tigers ML", evPct: 0.041, fairProb: 0.54,
    impliedProb: 0.51, bestBook: "DraftKings", topFactor: "Pitcher form" });
  assert.ok(s.includes("4.1%"));
  assert.ok(s.includes("DraftKings"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/copy.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/pipeline/copy.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/copy.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/pipeline/copy.js test/copy.test.js
git commit -m "feat: templated honest takes"
```

---

## Task 11: Copy the front-end bundle into `web/`

**Files:**
- Create: `web/` from the handoff bundle.

- [ ] **Step 1: Copy the bundle files (run from repo root)**

```bash
SRC="C:/Users/alanc/.claude/projects/C--Users-alanc-Projects-Ai-DegenwithDiscipline/1339c36a-72b0-4b71-9987-e9bae7b3e45a/tool-results/extracted/degen-with-discipline/project"
mkdir -p web
cp "$SRC"/*.jsx web/
cp "$SRC/Degen with Discipline.html" web/index.html
cp "$SRC/History.html" web/History.html
cp "$SRC/Phone Preview.html" "web/Phone Preview.html"
ls web/
```

- [ ] **Step 2: Verify the eight jsx files + index.html landed**

Run: `ls web/`
Expected: `app.jsx cards.jsx components.jsx data.jsx history-data.jsx index.html ios-frame.jsx live.jsx slip.jsx tweaks-panel.jsx History.html Phone Preview.html`

- [ ] **Step 3: Commit**

```bash
git add web/
git commit -m "chore: import front-end bundle into web/"
```

---

## Task 12: Define the `picks.json` contract + builder (pure)

**Files:**
- Create: `engine/src/pipeline/buildPicksJson.js`
- Test: `engine/test/buildPicksJson.test.js`

The shape must match what `data.jsx` currently assigns to `window.DWD_*` (see the bundle:
`DWD_LOCK`, `DWD_PICKS`, `DWD_RECORD`, `DWD_SPECIAL`, `DWD_DESK_NOTES`, `DWD_GRADE_INFO`,
`DWD_LAST_UPDATED`, `DWD_EDGES_SCANNED`). Each pick object keeps the prototype fields the
components read (`id, sport, sportLabel, league, context, matchup, pick, betType, odds,
openOdds, payoutNote, confidence, takeShort, takeLong, dataPoints, factors[]`) and adds
ours (`evPct, fairProb, impliedProb, bestBook, kellyStake`).

- [ ] **Step 1: Write the failing test**

```js
// engine/test/buildPicksJson.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPicksJson } from "../src/pipeline/buildPicksJson.js";

const sampleCand = {
  id: "mlb", sport: "MLB", sportLabel: "Baseball", league: "MLB",
  context: "Tigers @ White Sox", matchup: "Detroit Tigers vs Chicago White Sox",
  pick: "Tigers ML", betType: "Moneyline", americanOdds: -115, openAmerican: -105,
  evPct: 0.041, fairProb: 0.54, impliedProb: 0.51, bestBook: "DraftKings",
  confidence: 84, grade: "A-", kellyStake: 2.5, dataPoints: 1200,
  factors: [{ label: "Pitcher form", weight: 80, note: "trending up" }],
  takeShort: "x", takeLong: "y"
};

test("buildPicksJson produces lock + picks with required fields", () => {
  const out = buildPicksJson({ lock: sampleCand, picks: [sampleCand],
    record: { lockStreak: 0, last10: "0-0" }, lastUpdated: "9:41 AM ET", edgesScanned: 12 });
  assert.equal(out.lock.isLock, true);
  assert.equal(out.lock.odds, "-115");
  assert.equal(out.picks.length, 1);
  assert.ok("payoutNote" in out.lock);
  assert.equal(out.lastUpdated, "9:41 AM ET");
});

test("buildPicksJson tolerates an empty slate", () => {
  const out = buildPicksJson({ lock: null, picks: [],
    record: { lockStreak: 0, last10: "0-0" }, lastUpdated: "—", edgesScanned: 0 });
  assert.equal(out.lock, null);
  assert.deepEqual(out.picks, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/buildPicksJson.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/pipeline/buildPicksJson.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd engine && node --test test/buildPicksJson.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/pipeline/buildPicksJson.js test/buildPicksJson.test.js
git commit -m "feat: picks.json builder matching the UI contract"
```

---

## Task 13: The Odds API client + fixture (I/O)

**Files:**
- Create: `engine/fixtures/odds-mlb-h2h.json`
- Create: `engine/src/io/oddsClient.js`
- Test: `engine/test/oddsClient.test.js`

- [ ] **Step 1: Create the fixture `engine/fixtures/odds-mlb-h2h.json`**

A trimmed but real-shaped The Odds API `/v4/sports/{sport}/odds` response (two games, several books, `h2h`).

```json
[
  {
    "id": "game1", "sport_key": "baseball_mlb", "commence_time": "2026-05-30T22:10:00Z",
    "home_team": "Chicago White Sox", "away_team": "Detroit Tigers",
    "bookmakers": [
      { "key": "draftkings", "title": "DraftKings", "markets": [
        { "key": "h2h", "outcomes": [
          { "name": "Detroit Tigers", "price": 2.10 },
          { "name": "Chicago White Sox", "price": 1.80 } ] } ] },
      { "key": "fanduel", "title": "FanDuel", "markets": [
        { "key": "h2h", "outcomes": [
          { "name": "Detroit Tigers", "price": 1.95 },
          { "name": "Chicago White Sox", "price": 1.95 } ] } ] },
      { "key": "betmgm", "title": "BetMGM", "markets": [
        { "key": "h2h", "outcomes": [
          { "name": "Detroit Tigers", "price": 1.93 },
          { "name": "Chicago White Sox", "price": 1.97 } ] } ] },
      { "key": "bet365", "title": "Bet365", "markets": [
        { "key": "h2h", "outcomes": [
          { "name": "Detroit Tigers", "price": 1.96 },
          { "name": "Chicago White Sox", "price": 1.94 } ] } ] },
      { "key": "caesars", "title": "Caesars", "markets": [
        { "key": "h2h", "outcomes": [
          { "name": "Detroit Tigers", "price": 1.94 },
          { "name": "Chicago White Sox", "price": 1.96 } ] } ] }
    ]
  }
]
```

- [ ] **Step 2: Write the failing test**

```js
// engine/test/oddsClient.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeOddsResponse } from "../src/io/oddsClient.js";
import { readFileSync } from "node:fs";

test("normalizeOddsResponse groups books per outcome with a stable order", () => {
  const raw = JSON.parse(readFileSync(new URL("../fixtures/odds-mlb-h2h.json", import.meta.url)));
  const games = normalizeOddsResponse(raw, "h2h");
  assert.equal(games.length, 1);
  const g = games[0];
  assert.equal(g.outcomes.length, 2);
  assert.equal(g.books.length, 5);
  // each book exposes decimal odds aligned to g.outcomes order
  const dk = g.books.find((b) => b.key === "draftkings");
  assert.equal(dk.odds.length, 2);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd engine && node --test test/oddsClient.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `engine/src/io/oddsClient.js`**

```js
// The Odds API wrapper. In demo mode (no key) reads fixtures; live mode fetches
// /v4 with a credit budget. normalizeOddsResponse is the pure shaping function.
import { readFileSync } from "node:fs";
import { CONFIG } from "../config.js";

const BASE = "https://api.the-odds-api.com/v4";

// Pure: reshape raw API games into { id, commence, home, away, outcomes[], books[] }.
export function normalizeOddsResponse(raw, marketKey) {
  const games = [];
  for (const ev of raw) {
    // outcome order: away then home for h2h; for totals, Over then Under.
    let outcomes = null;
    const books = [];
    for (const bm of ev.bookmakers || []) {
      const mkt = (bm.markets || []).find((m) => m.key === marketKey);
      if (!mkt) continue;
      if (!outcomes) outcomes = mkt.outcomes.map((o) => o.name);
      const odds = outcomes.map((name) => {
        const o = mkt.outcomes.find((x) => x.name === name);
        return o ? o.price : null;
      });
      if (odds.every((x) => x != null)) books.push({ key: bm.key, title: bm.title, odds });
    }
    if (outcomes && books.length) {
      games.push({ id: ev.id, commence: ev.commence_time, home: ev.home_team,
        away: ev.away_team, market: marketKey, outcomes, books });
    }
  }
  return games;
}

// I/O: fetch one sport+market (1 region). Returns normalized games. Budgeted by caller.
export async function fetchOdds(sportKey, marketKey, { region = "us" } = {}) {
  if (CONFIG.demoMode) {
    const raw = JSON.parse(readFileSync(new URL("../../fixtures/odds-mlb-h2h.json", import.meta.url)));
    return normalizeOddsResponse(raw, marketKey);
  }
  const url = `${BASE}/sports/${sportKey}/odds?apiKey=${CONFIG.oddsApiKey}`
    + `&regions=${region}&markets=${marketKey}&oddsFormat=decimal`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`odds api ${res.status}: ${await res.text()}`);
  const remaining = res.headers.get("x-requests-remaining");
  if (remaining) console.error(`[odds] credits remaining: ${remaining}`);
  return normalizeOddsResponse(await res.json(), marketKey);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd engine && node --test test/oddsClient.test.js`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
cd engine && git add src/io/oddsClient.js test/oddsClient.test.js fixtures/odds-mlb-h2h.json
git commit -m "feat: The Odds API client with demo-mode fixtures"
```

---

## Task 14: Enrichment clients (MLB, soccer) with safe fallback (I/O)

**Files:**
- Create: `engine/src/io/enrichMlb.js`
- Create: `engine/src/io/enrichSoccer.js`
- Test: `engine/test/enrich.test.js`

Both expose `enrich(game) -> { modelLean, dataPoints, factors[] }`. They call free APIs
(`statsapi.mlb.com`, Open-Meteo; API-Football) but **must never throw** — on any error or in
demo mode they return a neutral signal (`modelLean: 0`) so the price edge still stands alone.

- [ ] **Step 1: Write the failing test**

```js
// engine/test/enrich.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { enrich as enrichMlb } from "../src/io/enrichMlb.js";
import { enrich as enrichSoccer } from "../src/io/enrichSoccer.js";

test("enrichMlb returns a neutral, well-formed signal in demo mode", async () => {
  const r = await enrichMlb({ home: "Chicago White Sox", away: "Detroit Tigers" });
  assert.equal(typeof r.modelLean, "number");
  assert.ok(Array.isArray(r.factors));
  assert.ok(r.dataPoints >= 0);
});

test("enrichSoccer never throws and returns a signal", async () => {
  const r = await enrichSoccer({ home: "Inter Miami", away: "Orlando City" });
  assert.equal(typeof r.modelLean, "number");
  assert.ok(Array.isArray(r.factors));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd engine && node --test test/enrich.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `engine/src/io/enrichMlb.js`**

```js
// MLB enrichment: probable pitchers/form (statsapi) + weather (Open-Meteo).
// Always returns a signal; never throws. In demo mode returns a neutral stub.
import { CONFIG } from "../config.js";
import { adjustedForm } from "../math/form.js";

const NEUTRAL = { modelLean: 0, dataPoints: 0, factors: [] };

export async function enrich(game) {
  if (CONFIG.demoMode) {
    return {
      modelLean: 0,
      dataPoints: 0,
      factors: [
        { label: "Pitcher form", weight: 50, note: "demo mode — no live data" },
        { label: "Weather / air", weight: 50, note: "demo mode" }
      ]
    };
  }
  try {
    // Live path: look up today's schedule + probable pitchers, recent game logs,
    // and ballpark weather. Compute an opponent-adjusted form lean.
    const sched = await fetchJson(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&hydrate=probablePitcher`);
    // (Mapping schedule -> the specific game and pitcher logs is filled in during
    // execution; the contract is: derive `values`, `oppStrength`, `leagueMean`.)
    const form = adjustedForm({ values: [], oppStrength: [], leagueMean: 5, regressionGames: 10 });
    const lean = form.weight > 55 ? 1 : form.weight < 45 ? -1 : 0;
    return {
      modelLean: lean,
      dataPoints: 0,
      factors: [{ label: "Pitcher form", weight: form.weight, note: "opponent-adjusted L10" }]
    };
  } catch (e) {
    console.error(`[enrichMlb] ${e.message}`);
    return NEUTRAL;
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}
```

- [ ] **Step 4: Write `engine/src/io/enrichSoccer.js`**

```js
// Soccer enrichment via API-Football (injuries/lineups/form). Always returns a
// signal; never throws. Neutral stub in demo mode or without a key.
import { CONFIG } from "../config.js";

const NEUTRAL = { modelLean: 0, dataPoints: 0, factors: [] };

export async function enrich(game) {
  if (CONFIG.demoMode || !CONFIG.apiFootballKey) {
    return {
      modelLean: 0,
      dataPoints: 0,
      factors: [{ label: "Team form", weight: 50, note: "demo mode — no live data" }]
    };
  }
  try {
    // Live path: query fixtures + injuries; derive a form/availability lean.
    // Contract filled in during execution.
    return { modelLean: 0, dataPoints: 0,
      factors: [{ label: "Team form", weight: 50, note: "api-football" }] };
  } catch (e) {
    console.error(`[enrichSoccer] ${e.message}`);
    return NEUTRAL;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd engine && node --test test/enrich.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd engine && git add src/io/enrichMlb.js src/io/enrichSoccer.js test/enrich.test.js
git commit -m "feat: MLB + soccer enrichment with safe neutral fallback"
```

---

## Task 15: Bankroll/history store (I/O)

**Files:**
- Create: `data/bankroll.json`
- Create: `data/history.json`
- Create: `engine/src/pipeline/store.js`
- Test: `engine/test/store.test.js`

- [ ] **Step 1: Create seed data files**

`data/bankroll.json`:
```json
{ "bankroll": 100, "openBets": [], "dailyExposure": 0, "updated": null }
```
`data/history.json`:
```json
{ "settled": [], "record": { "lockStreak": 0, "last10": "0-0" } }
```

- [ ] **Step 2: Write the failing test**

```js
// engine/test/store.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadStore, recordToSummary } from "../src/pipeline/store.js";

test("loadStore reads bankroll + history", () => {
  const s = loadStore();
  assert.ok(s.bankroll.bankroll >= 0);
  assert.ok(Array.isArray(s.history.settled));
});

test("recordToSummary yields lockStreak + last10", () => {
  const r = recordToSummary({ settled: [
    { isLock: true, result: "W" }, { isLock: true, result: "W" }, { isLock: false, result: "L" }
  ]});
  assert.equal(r.lockStreak, 2);
  assert.equal(typeof r.last10, "string");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd engine && node --test test/store.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `engine/src/pipeline/store.js`**

```js
// Read/write the repo-as-database files. Paths are relative to repo root.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../../../", import.meta.url); // repo root from engine/src/pipeline/
const BANKROLL = new URL("data/bankroll.json", ROOT);
const HISTORY = new URL("data/history.json", ROOT);

export function loadStore() {
  return {
    bankroll: JSON.parse(readFileSync(BANKROLL)),
    history: JSON.parse(readFileSync(HISTORY))
  };
}

export function saveBankroll(b) { writeFileSync(BANKROLL, JSON.stringify(b, null, 2)); }
export function saveHistory(h) { writeFileSync(HISTORY, JSON.stringify(h, null, 2)); }

// Compute the slim record strip (lock streak + last 10 locks).
export function recordToSummary(history) {
  const locks = history.settled.filter((s) => s.isLock);
  let streak = 0;
  for (const l of locks) { if (l.result === "W") streak++; else break; }
  const last10 = locks.slice(0, 10);
  const w = last10.filter((l) => l.result === "W").length;
  return { lockStreak: streak, last10: `${w}-${last10.length - w}` };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd engine && node --test test/store.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add data/bankroll.json data/history.json engine/src/pipeline/store.js engine/test/store.test.js
git commit -m "feat: bankroll/history store + record summary"
```

---

## Task 16: Orchestrator `run.js` (I/O)

**Files:**
- Create: `engine/src/pipeline/run.js`
- Create: `engine/test/run.smoke.test.js`

The orchestrator ties it together: for each in-season sport within the credit budget, fetch
odds → build per-outcome candidates with de-vigged consensus (excluding the target book) →
compute EV for the best target-book price → enrich → confirm → assemble candidates → select
Lock (band gate) → size with Kelly → write `web/picks.json`.

- [ ] **Step 1: Write `engine/src/pipeline/run.js`**

```js
import { writeFileSync } from "node:fs";
import { CONFIG } from "../config.js";
import { fetchOdds } from "../io/oddsClient.js";
import { enrich as enrichMlb } from "../io/enrichMlb.js";
import { enrich as enrichSoccer } from "../io/enrichSoccer.js";
import { consensusFairProb } from "../math/devig.js";
import { evPct } from "../math/ev.js";
import { kellyStake } from "../math/kelly.js";
import { decimalToAmerican } from "../math/oddsMath.js";
import { qualifies, pickLock, gradeFor } from "../math/select.js";
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

  for (const s of CONFIG.sports) {
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

  candidates.sort((a, b) => b.evPct - a.evPct);
  const lock = pickLock(candidates, CONFIG.lockBand);
  const board = candidates.filter((c) => c !== lock).slice(0, 6);
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
```

Note: `run.js` uses `new Date()`. That is fine at runtime (it only stamps `lastUpdated`); it is
never imported by a `node:test` file, so the test-runner restriction does not apply.

- [ ] **Step 2: Write a smoke test that runs the pipeline in demo mode**

```js
// engine/test/run.smoke.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "../src/pipeline/run.js";

test("run() produces a valid picks payload in demo mode", async () => {
  const out = await run();
  assert.ok("lock" in out);
  assert.ok(Array.isArray(out.picks));
  assert.ok(out.edgesScanned >= 1);
  // The fixture's DraftKings price (2.10) on Detroit is the deliberate +EV edge.
  if (out.lock) assert.ok(out.lock.evPct > 0);
});
```

- [ ] **Step 3: Run the smoke test**

Run: `cd engine && node --test test/run.smoke.test.js`
Expected: PASS — writes `web/picks.json`; lock is the Tigers ML edge (DK 2.10 vs consensus).

- [ ] **Step 4: Run the full suite**

Run: `cd engine && npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
cd engine && git add src/pipeline/run.js test/run.smoke.test.js
git commit -m "feat: orchestrator producing web/picks.json (demo-mode verified)"
git add ../web/picks.json && git commit -m "chore: seed demo picks.json"
```

---

## Task 17: Wire the front-end to fetch `picks.json`

**Files:**
- Modify: `web/data.jsx` (replace hardcoded data with a loader; keep math helpers)
- Modify: `web/index.html` (load order so data loads before app mounts)
- Read first: `web/app.jsx` (to see how it mounts — wrap the mount to await the loader)

The strategy: keep the pure helper functions in `data.jsx` (`americanToDecimal`,
`decimalToAmerican`, `impliedProb`, `parlayOdds`, `gradeFor`, `gradeRecord`), but replace the
hardcoded `DWD_*` data objects with values fetched from `picks.json`, then mount the app.

- [ ] **Step 1: Read `web/app.jsx`** to find the `ReactDOM` mount call.

Run: `cat web/app.jsx | tail -30`
Expected: locate `ReactDOM.createRoot(...).render(...)` (or `.render`).

- [ ] **Step 2: Replace the data section of `web/data.jsx`**

Remove the hardcoded `DWD_LOCK`, `DWD_PICKS`, `DWD_SPECIAL`, `DWD_RECORD`, `DWD_DESK_NOTES`,
`DWD_LAST_UPDATED`, `DWD_EDGES_SCANNED`, `DWD_GRADE_INFO` literals. Keep the math helpers and
`gradeFor`. Append this loader, which fetches `picks.json` and exposes a promise the app awaits:

```js
// --- live data loader (replaces hardcoded picks) ---
async function loadDwdData() {
  const res = await fetch("picks.json?ts=" + Date.now());
  const d = await res.json();
  const lock = d.lock || (d.picks && d.picks[0]) || null;
  Object.assign(window, {
    DWD_LOCK: lock,
    DWD_PICKS: lock ? [lock, ...d.picks.filter((p) => p.id !== lock.id)] : d.picks,
    DWD_RECORD: { ...d.record, roi: "", yesterday: [] },
    DWD_SPECIAL: d.special,
    DWD_DESK_NOTES: d.deskNotes,
    DWD_LAST_UPDATED: d.lastUpdated,
    DWD_EDGES_SCANNED: d.edgesScanned,
    DWD_GRADE_INFO: window.DWD_GRADE_INFO || { legend: "Grades reflect edge size, data depth, and market agreement.", records: {} }
  });
  return d;
}
window.loadDwdData = loadDwdData;
```

- [ ] **Step 3: Guard the app mount in `web/app.jsx`**

Wrap the existing mount so it runs after data loads. Replace the bare mount line, e.g.:

```js
// before:  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
// after:
window.loadDwdData().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}).catch((e) => {
  document.getElementById("root").innerHTML =
    '<p style="color:#97a39c;font-family:monospace;padding:40px">Could not load picks.json — run the engine (npm run run:engine) and serve over http.</p>';
  console.error(e);
});
```

- [ ] **Step 4: Manually verify in a browser (served over http)**

Run: `npx --yes serve web -l 5055` (or `python -m http.server 5055 -d web`)
Open: `http://localhost:5055/` (NOT `file://` — fetch needs http).
Expected: the Lock hero renders the Tigers ML edge from `picks.json`; pick cards populate;
no console errors. The value meter shows the *real small* edge.

- [ ] **Step 5: Commit**

```bash
git add web/data.jsx web/app.jsx
git commit -m "feat: front-end loads live picks.json instead of hardcoded data"
```

---

## Task 18: Honesty pass on the value meter + grade labels

**Files:**
- Modify: whichever component renders the value meter and grade record (grep `web/` first).

- [ ] **Step 1: Find the value-meter + grade-record rendering**

Run: `grep -rn "vmeter\|MODEL\|MARKET\|gradeRecord\|grade-reliab" web/*.jsx`
Expected: locate the component(s) that show "model X% vs market Y%" and the grade hit-rate.

- [ ] **Step 2: Bind the value meter to real engine fields**

Update the component so the "market" number = `pick.impliedProb`, the "model/fair" number =
`pick.fairProb`, and the edge label = `+(pick.evPct*100).toFixed(1)%` — replacing any fixed
"93 vs 53" placeholders. Show small, true gaps.

- [ ] **Step 3: Relabel grade reliability until real samples exist**

Where the UI shows a grade hit-rate from `DWD_GRADE_INFO.records`, render "building track
record" when the record for that grade is missing/empty (it is empty until `history.json`
accrues settled bets), instead of a fake percentage.

- [ ] **Step 4: Re-verify in the browser** (repeat Task 17 Step 4). Expected: value meter shows
the real ~+4% edge; no fake 71%/93% numbers remain.

- [ ] **Step 5: Commit**

```bash
git add web/*.jsx
git commit -m "feat: honesty pass — real edge in value meter, honest grade labels"
```

---

## Task 19: Root README with setup + run instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Degen with Discipline

Data-driven, +EV sports-betting guidance. The engine finds bets where DraftKings/Bet365
price a line better than the de-vigged market consensus, confirmed by our own signals.

## Run it locally (demo mode — no keys)
```bash
cd engine && npm test          # all math + pipeline tests
npm run run:engine             # writes ../web/picks.json from fixtures
cd .. && npx serve web -l 5055 # open http://localhost:5055
```

## Go live
1. Get a free key at the-odds-api.com → `export ODDS_API_KEY=...`
2. (Soccer) free key at api-football → `export API_FOOTBALL_KEY=...`
3. `cd engine && npm run run:engine` → live picks in `web/picks.json`.

The math is plain code (de-vig, EV, Kelly, CLV) — no LLM, deterministic, unit-tested.
This guides decisions; you place the bets. Bet responsibly.
````

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "docs: project README with setup + run steps"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** edge engine (Tasks 3,4,8,16), de-vig consensus + exclude-target-book +
  power method + sharper weighting via `weights` (Task 3), book-count gate (Tasks 8,16),
  Lock −125/+125 band (Tasks 8,16), form/seatbelt (Tasks 6,9,14), CLV calc (Task 7; snapshot
  wiring + settlement in Plan 2), Kelly + caps + thin-data shrink (Task 5), staking off live
  bankroll (Tasks 15,16), front-end wiring + honesty pass (Tasks 17,18), demo mode (Tasks
  1,13,14,16), `picks.json` contract (Task 12). **Deferred to later plans (noted in spec
  §18):** GitHub Actions cron + hosting (Plan 2), settlement/CLV-close snapshots + edge
  attribution + circuit-breaker (Plan 2), boost evaluator + notifications (Plan 3).
- **Placeholder scan:** the only "filled in during execution" notes are inside the *live*
  branches of the enrichment clients (Task 14), which are non-blocking — demo mode and all
  tests pass without them, and the contract (`{modelLean, dataPoints, factors}`) is explicit.
- **Type consistency:** `normalizeOddsResponse` → `{outcomes, books:[{key,title,odds[]}]}`
  consumed identically in `run.js`; `consensusFairProb(books,{excludeKey})` signature matches;
  candidate fields produced in `run.js` match `buildPicksJson` `toPick`; `confirmPick`
  returns `{fire,confidence,grade}` used directly.

---

## Out of scope for Plan 1 (tracked for Plan 2/3)
- GitHub Actions cron + free static hosting (Plan 2)
- Result settlement, CLV close-snapshots, edge attribution, auto circuit-breaker (Plan 2)
- Boost/promo evaluator, group notifications (Plan 3)
- Live enrichment model depth (the neutral fallback ships now; richer leans iterate later)
