// ESPN scoreboard (free, no key) → final scores for settlement. Never throws.
// Keyed by The Odds API sport key so the engine can map a pick to the right feed.
const ESPN_PATH = {
  baseball_mlb: "baseball/mlb",
  baseball_ncaa: "baseball/college-baseball",
  basketball_wnba: "basketball/wnba",
  soccer_usa_mls: "soccer/usa.1",
  soccer_epl: "soccer/eng.1",
  soccer_brazil_campeonato: "soccer/bra.1",
  soccer_brazil_serie_b: "soccer/bra.2",
  soccer_japan_j_league: "soccer/jpn.1",
  soccer_conmebol_copa_libertadores: "soccer/conmebol.libertadores",
  soccer_conmebol_copa_sudamericana: "soccer/conmebol.sudamericana",
  soccer_norway_eliteserien: "soccer/nor.1",
  soccer_sweden_allsvenskan: "soccer/swe.1",
  soccer_belgium_first_div: "soccer/bel.1",
  soccer_spain_segunda_division: "soccer/esp.2",
  soccer_finland_veikkausliiga: "soccer/fin.1",
  soccer_chile_campeonato: "soccer/chi.1"
};

// Pure: reshape an ESPN scoreboard payload into [{homeTeam,awayTeam,homeScore,awayScore,final}].
export function normalizeScoreboard(data) {
  const out = [];
  for (const ev of data.events || []) {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) continue;
    const home = (comp.competitors || []).find((c) => c.homeAway === "home");
    const away = (comp.competitors || []).find((c) => c.homeAway === "away");
    if (!home || !away) continue;
    const homeScore = Number(home.score);
    const awayScore = Number(away.score);
    const completed = !!(comp.status && comp.status.type && comp.status.type.completed);
    out.push({
      homeTeam: home.team && home.team.displayName,
      awayTeam: away.team && away.team.displayName,
      homeScore,
      awayScore,
      // only "final" if BOTH scores are real numbers — a blank score must NOT become a 0-0
      final: completed && Number.isFinite(homeScore) && Number.isFinite(awayScore)
    });
  }
  return out;
}

// I/O: fetch finals for a sport + YYYYMMDD date. Returns [] on any error.
export async function fetchFinals(oddsSportKey, yyyymmdd) {
  const path = ESPN_PATH[oddsSportKey];
  if (!path) return [];
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${yyyymmdd}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return normalizeScoreboard(await res.json());
  } catch (e) {
    console.error(`[scores] ${oddsSportKey} ${yyyymmdd}: ${e.message}`);
    return [];
  }
}
