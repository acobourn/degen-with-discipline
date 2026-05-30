// Central config: thresholds, sport candidates, env, odds band.
export const CONFIG = {
  oddsApiKey: process.env.ODDS_API_KEY || null,
  apiFootballKey: process.env.API_FOOTBALL_KEY || null,
  demoMode: !process.env.ODDS_API_KEY, // no key => run from fixtures
  // alerts (optional): set whichever channel you want
  discordWebhook: process.env.DISCORD_WEBHOOK || null,
  resendApiKey: process.env.RESEND_API_KEY || null,
  alertEmail: process.env.ALERT_EMAIL || null,
  alertFrom: process.env.ALERT_FROM || "Degen with Discipline <onboarding@resend.dev>",
  siteUrl: "https://acobourn.github.io/degen-with-discipline/",
  evThreshold: 0.02,            // 2% minimum edge to surface
  maxEvPct: 0.08,               // EV above this = almost certainly bad data, not a real edge
  maxDispersion: 0.08,          // max book disagreement (de-vigged prob range) we'll trust
  saneOdds: { min: -250, max: 250 }, // no absurd -800 "value" favorites on the board
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
