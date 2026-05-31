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
  evThreshold: 0.03,            // 3% minimum edge — skip the marginal 2% grinders (small bankroll)
  maxEvPct: 0.08,               // EV above this = almost certainly bad data, not a real edge
  maxDispersion: 0.08,          // max book disagreement (de-vigged prob range) we'll trust
  saneOdds: { min: -150, max: 250 }, // no heavy chalk: risking >1.5x to win 1x is bad R/R on $100
  minBooks: 4,                  // book-count gate: need >=4 books for consensus
  lockBand: { minAmerican: -125, maxAmerican: 125 }, // Lock odds band
  targetBooks: ["draftkings", "betmgm", "fanduel", "bet365"], // soft books we'd actually bet (best price among present)
  sharpBooks: ["pinnacle", "betfair_ex_eu", "matchbook"],     // SHARP anchors (eu region) — our "true line"
  kelly: { fraction: 0.25, maxPct: 0.03 }, // 1/4 Kelly capped at 3% bankroll
  // Scan plan: anchors scan every run (richest edge); the international pool rotates so we
  // cover it across runs while staying inside the free-tier credit budget. Only ACTIVE
  // leagues are scanned (checked free via /sports), so off-season keys cost nothing.
  scanPlan: {
    // Credit cost per entry = markets × regions. MLB anchor uses us,eu (Pinnacle anchor = 2
    // regions); thin international falls back to soft consensus on us only (1 region).
    creditTarget: 5, // MLB(2 mkts × 2 regions = 4) + 1 rotation league (1) -> ~450/mo at 3 scans/day
    anchors: [
      { key: "baseball_mlb", sport: "MLB", label: "Baseball", league: "MLB", markets: ["h2h", "totals"], regions: "us,eu" }
    ],
    rotation: [
      { key: "baseball_ncaa", sport: "MLB", label: "College Baseball", league: "NCAA Baseball", markets: ["h2h"] },
      { key: "basketball_wnba", sport: "NBA", label: "Basketball", league: "WNBA", markets: ["h2h"] },
      { key: "soccer_brazil_campeonato", sport: "SOC", label: "Soccer", league: "Brazil Série A", markets: ["h2h"] },
      { key: "soccer_brazil_serie_b", sport: "SOC", label: "Soccer", league: "Brazil Série B", markets: ["h2h"] },
      { key: "soccer_japan_j_league", sport: "SOC", label: "Soccer", league: "J-League", markets: ["h2h"] },
      { key: "soccer_conmebol_copa_libertadores", sport: "SOC", label: "Soccer", league: "Copa Libertadores", markets: ["h2h"] },
      { key: "soccer_conmebol_copa_sudamericana", sport: "SOC", label: "Soccer", league: "Copa Sudamericana", markets: ["h2h"] },
      { key: "soccer_norway_eliteserien", sport: "SOC", label: "Soccer", league: "Eliteserien", markets: ["h2h"] },
      { key: "soccer_sweden_allsvenskan", sport: "SOC", label: "Soccer", league: "Allsvenskan", markets: ["h2h"] },
      { key: "soccer_belgium_first_div", sport: "SOC", label: "Soccer", league: "Belgium First Div", markets: ["h2h"] },
      { key: "soccer_spain_segunda_division", sport: "SOC", label: "Soccer", league: "La Liga 2", markets: ["h2h"] },
      { key: "soccer_finland_veikkausliiga", sport: "SOC", label: "Soccer", league: "Veikkausliiga", markets: ["h2h"] },
      { key: "soccer_chile_campeonato", sport: "SOC", label: "Soccer", league: "Primera Chile", markets: ["h2h"] }
    ]
  }
};
