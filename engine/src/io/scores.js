// ESPN scoreboard (free, no key) → final scores for settlement. Never throws.
// Keyed by The Odds API sport key so the engine can map a pick to the right feed.
const ESPN_PATH = {
  baseball_mlb: "baseball/mlb",
  baseball_ncaa: "baseball/college-baseball",
  soccer_usa_mls: "soccer/usa.1",
  soccer_epl: "soccer/eng.1"
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
    out.push({
      homeTeam: home.team && home.team.displayName,
      awayTeam: away.team && away.team.displayName,
      homeScore: Number(home.score),
      awayScore: Number(away.score),
      final: !!(comp.status && comp.status.type && comp.status.type.completed)
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
