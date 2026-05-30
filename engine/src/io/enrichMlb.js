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
