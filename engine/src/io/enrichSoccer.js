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
