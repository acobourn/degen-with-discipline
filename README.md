# Degen with Discipline

Data-driven, **+EV** sports-betting guidance. The engine finds bets where DraftKings/Bet365
price a line **better than the de-vigged market consensus**, confirmed by our own signals
(form, injuries, weather). It guides decisions — **you** place the bets. Bet responsibly. 21+.

> The edge is catching mispriced lines, **not** out-predicting the market. Real edges are
> 1–5%, not magic. The "Lock of the Day" is the highest-EV play inside the −125/+125 band.

## Run it locally (demo mode — no API keys needed)

```bash
cd engine
npm test                 # all math + pipeline tests (33)
npm run run:engine       # writes ../web/picks.json from fixtures
cd ..
npx serve web -l 5055    # then open http://localhost:5055
```

Open over **http**, not `file://` — the front-end `fetch()`es `picks.json`.

## Go live (free tier)

1. Free key at **the-odds-api.com** → `set ODDS_API_KEY=...` (PowerShell: `$env:ODDS_API_KEY="..."`)
2. (Soccer) free key at **api-football** → `API_FOOTBALL_KEY=...`
3. `cd engine && npm run run:engine` → live picks in `web/picks.json`.

Without `ODDS_API_KEY` the engine runs in **demo mode** from `engine/fixtures/`.

## How it works

- **Engine** (`engine/`, zero-dependency Node): de-vig (power method) → consensus fair value
  (excluding the book you'd bet) → EV% → book-count + EV gates → enrich (form/weather/injuries)
  → confirm (model must not contradict the market) → crown the Lock in the −125/+125 band →
  ¼-Kelly stake capped at ~3% of bankroll. All math is plain code, unit-tested — **no LLM**.
- **Front-end** (`web/`): the existing UI, unchanged, now reads `picks.json` instead of fake
  data. The value meter shows the *real small* edge; grades show "building track record" until
  real bets settle. We don't lie to ourselves — that's the discipline.
- **Data** (`data/`): `bankroll.json` + `history.json` — the repo is the database.

## Roadmap

- **Plan 2:** GitHub Actions cron (auto-runs free in the cloud) + free hosting; result
  settlement, CLV close-snapshots, edge attribution + auto circuit-breaker.
- **Plan 3:** boost/promo evaluator, group (Discord/email) notifications.

See `docs/superpowers/` for the full spec and plans.
