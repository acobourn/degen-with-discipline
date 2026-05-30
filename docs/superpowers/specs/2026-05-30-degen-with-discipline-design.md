# Degen with Discipline — Design Spec

_Date: 2026-05-30 · Status: awaiting user review_

## 1. Goal

Turn the existing **Degen with Discipline** UI mockup (a beautiful but fully-faked React/HTML
prototype) into a working, honest, **data-driven sports-betting guidance tool** that finds
small, real, repeatable edges for a ~$100 bankroll shared by the user and friends.

The product is a **guided decision tool**, not an income engine. The win condition is making
**disciplined, positive-expected-value (+EV) decisions** and *proving* the process works via
Closing Line Value — the money follows slowly if the process is sound.

## 2. Core thesis (what actually makes money)

We do **not** try to out-predict the betting market — that is a fantasy that loses money.
The market price already encodes the most accurate prediction available (sharp money, book
models, injuries, weather). Instead:

> **The edge = catching when a soft book's _price_ is wrong relative to the rest of the
> market's true (de-vigged) consensus — confirmed by our own predictive signals — and
> betting only then.**

"Model finds, market confirms": predictive variables (form, injuries, weather) are the search
dogs and the seatbelt; the **price discrepancy** is the actual edge. When our model strongly
*disagrees* with the market, that is a **suppressed warning, not a bet**.

## 3. Honest expectations (must be stated in-product)

- Real edges are **1–5%**, not the mockup's fake "+40 points."
- On $100 with $2–3 bets, profit is **slow and high-variance**; losing weeks are normal.
- Books **limit winners**; this stays a sharp hobby + learning tool.
- The in-product value meter and grade-reliability numbers must reflect **real, small** edges
  and **real settled results** — never faked. Self-honesty is the discipline.

## 4. Architecture

Two halves connected by one file, with the repo acting as the database.

```
┌─────────────────────────────┐         ┌──────────────────────────┐
│  THE ENGINE (Node, on cron) │  writes │  THE FRONT-END (the UI)  │
│  GitHub Actions ~2x/day      │ ──────▶ │  reads picks.json,       │
│  (free, runs w/ all PCs off) │ picks.  │  renders existing design │
│                              │ json    │  hosted free, group URL  │
└─────────────────────────────┘         └──────────────────────────┘
        │ commits back
        ▼
  picks.json · bankroll.json · history.json   (repo = database)
```

- **Engine**: plain Node code (no LLM in the math). Runs on **GitHub Actions cron**, free,
  even when every computer is off. Commits updated `picks.json`, `bankroll.json`,
  `history.json` back to the repo; the site redeploys automatically.
- **API key** lives as a GitHub Actions secret — **never** in the browser (would let anyone
  drain the 500 free credits).
- **Front-end**: the existing prototype, hosted on free static hosting (Vercel/Netlify/GitHub
  Pages). Friends open one URL.
- **Claude layer**: explicitly **phase 2** — language/judgment only (news-parsing, witty
  takes, "why this pick?" chat). Never the math, never the final pick.

## 5. The edge methodology (the engine's brain)

### 5.1 Fair value via de-vigged consensus (our Pinnacle substitute)
The Odds API does **not** carry Pinnacle. So fair value = consensus of all carried books:

1. For each event+market, collect every book's prices.
2. **De-vig with the power/Shin method** (not naive proportional) to correct
   favorite–longshot bias.
3. **Exclude the target book** (the one we might bet, e.g. DraftKings) from the consensus —
   otherwise the comparison is circular and overstates the edge.
4. **Weight toward sharper books** (lower-hold, market-making books in the feed) over purely
   recreational ones.
5. Output: consensus fair probability → fair odds.

### 5.2 Finding +EV
- For DK and Bet365 specifically: `EV% = (offered_decimal_odds × fair_prob) − 1`.
- Surface only when `EV% ≥ threshold` (start ~2–3%).
- **Book-count gate**: require ≥ ~4 books pricing the event, or there is no trustworthy
  consensus and we skip it. This single rule auto-rejects un-priceable obscure markets and
  auto-discovers the "soft but liquid enough" sweet spot.
- **Hold/vig display**: lower market hold ⇒ sharper ⇒ trust the consensus more.

### 5.3 Confirm with predictive signals (the seatbelt)
A pick fires only if EV clears the bar **and** the model lean does not contradict the market
direction. Contradiction ⇒ suppressed warning, not a bet.

## 6. Predictive enrichment layer (free APIs, no odds credits)

All predictive/context data comes from **free, non-odds APIs**, so we can be rich on the "why"
cheaply and stingy only on odds calls.

- **MLB** (`enrich/mlb`): official `statsapi.mlb.com` (probable pitchers, lineups, injuries,
  game logs), Open-Meteo (ballpark weather), static park-factor table.
- **Soccer** (`enrich/soccer`): API-Football free tier (injuries, lineups, recent form/xG).
- **Other sports**: ESPN hidden API for injuries/scores where available.

### 6.1 Recent-form / trend engine (done with discipline)
Rolling windows (last 5 / 10 / 15), **opponent/park/weather-adjusted**, **regressed to the
mean**. Form is **one weighted factor**, never the sole reason. Its real value:
- **Seatbelt**: confirm/suppress +EV signals.
- **Lag-catching**: fresh trends the soft book hasn't absorbed yet.
- **Thin markets**: where books are lazy (college baseball, lower soccer), adjusted form can
  genuinely beat their line — the biggest DIY edge.

Outputs feed both the UI **factor bars** and the **confirm** decision.

## 7. Sports portfolio & market-efficiency tiering

Hunt where the books aren't looking, but stay where our engine can actually measure.

- **Core**: MLB (data-rich anchor, semi-soft, high volume), College baseball (NCAA), and
  International + MLS soccer.
- **Rotating candidates** (when they have games): NPB/KBO baseball, WNBA, Euroleague /
  international basketball, minor-league baseball.
- **Excluded**: ping pong (few books ⇒ un-priceable, thin data, match-fixing/syndicate risk)
  and any 1–2-book market (auto-rejected by the book-count gate).
- **Tiering**: bet bigger/more often in lazy markets; treat razor-efficient markets (e.g. NBA
  Finals moneyline) with skepticism.

The engine is given the broad candidate list and, per scheduled scan, works only the sports
that (a) have games, (b) pass the book-count gate, (c) fit the credit budget.

## 8. Closing Line Value (CLV) — the proof of edge

The single most important metric. **CLV = did we get a better number than the line's close?**
- Snapshot the line when a pick is flagged; snapshot again near game time (one cheap call).
- Track the gap per bet and in aggregate.
- Positive CLV over 30–50 bets ⇒ we are mathematically +EV even before W/L confirms it.
- Negative CLV ⇒ fix the engine. CLV is the **leading indicator**; W/L is noisy.
- **Tracked from day one.** The user opts to *watch* the CLV trend with no real money and
  flip to live stakes at their own discretion ("bet when it matters") — no formal paper gate,
  but the safety data is always there to look at.

## 9. Calibration loop & edge attribution

- **Calibration**: once a track record exists, verify that picks we rate ~54% actually win
  ~54%. This makes the UI's grade-reliability table **real and self-correcting** (labeled
  "building track record" until enough samples), and honestly proves the edge to the group.
- **Edge attribution**: segment CLV and results **by sport, market, and book** — so we learn
  *where* our edge actually lives (e.g. "strong on college-baseball totals, flat on MLB
  moneylines") instead of one blended number. v1 ships the segmentation (it's just grouping
  data we already track).
- **Auto circuit-breaker** (fast-follow): when a segment's rolling CLV goes negative, the
  engine **auto-pauses recommendations** for it. The tool stops suggesting what it's bad at.

## 10. Staking — fractional Kelly with caps

- **¼-Kelly**, sized off the **live** bankroll, **capped at ~3%** of bankroll (≈ $3 early).
- Auto-grows stakes as bankroll grows; auto-shrinks after losses.
- Cap total **daily exposure**; correlation-adjust if multiple bets touch the same game.
- **Shrink Kelly when the data is thin** — small sample / high uncertainty ⇒ smaller stake.

## 11. Discipline guardrails (the other half of the name)

- **Bet log + feedback loop**: every recommended bet — placed?, price, result, CLV. No log ⇒
  no learning.
- **Drawdown + daily-exposure caps**: a hard "you've risked enough today / the math says
  **pass**" brake. Some days the disciplined play is **no bet**, and the tool says so proudly.
- **Parlay honesty**: the "Degen Special" is flagged as **entertainment money** (parlays stack
  the vig, almost always −EV); real stakes steered to singles.
- **Responsible-gambling**: loss limits, plain disclaimers, no chasing.
- **Stale-line / game-started guard**: never surface a pick whose game has started or whose
  data is stale — no betting on dead info.
- **Bad-data outlier rejection**: discard obviously-broken odds (suspended lines, a lone book
  showing −10000) before they poison the consensus.

## 12. Lock of the Day

= the single highest-EV qualifying play **with odds between −125 and +125** (real chance to
win, Kelly-friendly band, where soft-book mispricing is most findable). Other board picks may
run slightly wider but must still be sane and pass all gates.

## 13. Front-end changes (deliberately minimal)

- Keep **every component and all CSS untouched**. The existing files (in the handoff bundle:
  `data.jsx`, `cards.jsx`, `components.jsx`, `live.jsx`, `slip.jsx`, `app.jsx`,
  `tweaks-panel.jsx`, `ios-frame.jsx`, `history-data.jsx`, and the two HTML pages) are copied
  into the repo as step 1 of implementation.
- Replace hardcoded `data.jsx` with a `fetch('picks.json')` that populates the same
  `window.DWD_*` globals (`DWD_LOCK`, `DWD_PICKS`, `DWD_RECORD`, `DWD_SPECIAL`, etc.), then
  renders. Same shape ⇒ no component changes.
- **Honesty pass**: value meter shows the *true small* edge (e.g. "fair 54% / DK implies 51% →
  +3% EV"); grade-reliability becomes **real settled numbers**; add a visible "last updated"
  and CLV summary.

## 14. Data contracts

- **`picks.json`** — mirrors the existing front-end shape: a `lock`, a `picks[]` array
  (per-sport best edges with `odds`, `betType`, `confidence`, `factors[]`, `bestBook`,
  `evPct`, `fairProb`, `kellyStake`, line-movement fields), the `special`, `record`, desk
  notes, and `lastUpdated`.
- **`bankroll.json`** — current bankroll, open bets, daily exposure used.
- **`history.json`** — settled bets with result, CLV, grade; powers the History page and
  calibration.

Exact field-level schemas are finalized in the implementation plan.

## 15. Engine modules (small, isolated, testable)

| Module | Responsibility | Purity |
|---|---|---|
| `oddsClient` | The Odds API wrapper + credit budgeting + cache | I/O |
| `devig` | prices → no-vig consensus fair prob (power/Shin) | **pure** |
| `ev` | fair prob + offered odds → EV%, Kelly stake | **pure** |
| `enrich/mlb`, `enrich/soccer` | free predictive data → signals + factor bars | I/O |
| `form` | opponent-adjusted rolling-window trend signal | **pure** |
| `confirm` | EV + model lean → fire/suppress + confidence/grade | mostly pure |
| `select` | rank, crown Lock (band gate), assign Kelly stakes | pure |
| `clv` | snapshot lines, compute CLV | I/O + pure calc |
| `copy` | templated takes from real data (no LLM) | pure |
| `settle` | fetch scores, grade history, update bankroll/record | I/O |
| `buildPicksJson` | assemble front-end shape | pure |
| `run` | orchestrator / cron entry point | I/O |

The pure-math modules (`devig`, `ev`, `form`, `select`) get **real unit tests first (TDD)**.

## 16. The Odds API credit budget (free tier = 500/month)

- Cost = regions × markets per odds call. Plan: 2 sports × (`h2h`,`totals`) × ~2 scans/day ≈
  240 credits/month, leaving buffer for CLV close-snapshots and 1–2 marquee MLB prop peeks.
- `/sports` and `/events` endpoints are free — use them to gate before spending credits.
- Player props are **not** the backbone on free tier (per-event cost); game lines are.

## 17. What we need from the user (later, with guidance)

- Free **The Odds API** key.
- Free **API-Football** key (soccer injuries/lineups).
- A **GitHub account** (hosts the site + runs the free cron).
- **Accounts at several books, not just one** — the line-shopping edge only pays if the user
  (and friends) can actually take the best available price. Worth setting up early.

## 18. Roadmap after v1

### Phase 1.5 — high-priority fast-follows
- **Boost / promo evaluator** — paste in a DK/Bet365 boost ("30% profit boost on any MLB
  game") and the tool reuses the fair-value math to surface the **best +EV way to use it**.
  For a small bankroll, boosts are often a *bigger, more reliable* edge than core +EV
  grinding — high priority.
- **Group notifications** — a free Discord/group-chat webhook (or email) that posts the Lock
  of the Day and any **fresh, time-sensitive** edge the instant the engine finds it, so the
  group acts before the line corrects.
- **Auto circuit-breaker** — auto-pause segments whose rolling CLV turns negative (see §9).

### Phase 2 — deferred
Claude language layer (news-parsing into signals, witty takes, "why this pick?" chat) ·
steam/line-move confirmation from our own snapshots · public-betting "fade the square" data
(needs paid feed) · reconsider niche markets once CLV proves the core.

## 19. Non-goals / out of scope

- Out-predicting the market; any LLM in the betting math.
- Player-prop backbone on the free tier.
- Real-money placement/automation — the tool **guides**; the human places the bet.
- Ping pong and 1–2-book markets.

## 20. Open questions / risks

- The Odds API region for Bet365 + DK depends on the user's state (confirm at setup).
- Free-tier credits are tight; if coverage feels thin, the lever is the paid tier (deferred).
- Thin-market data availability varies; the book-count gate protects against acting blind.
