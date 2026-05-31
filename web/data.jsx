// data.jsx — Degen with Discipline / live data loader
// The pure helper functions stay here; the actual picks are fetched from
// picks.json (written by the engine) and assigned to the window.DWD_* globals
// the components read. No hardcoded picks anymore — everything is real engine output.

/* ---------- odds math ---------- */
function americanToDecimal(a) {
  const n = typeof a === "string" ? parseInt(a, 10) : a;
  return n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1;
}
function decimalToAmerican(d) {
  if (d <= 1) return "+100";
  const a = d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
  return (a > 0 ? "+" : "") + a;
}
function impliedProb(a) {
  const n = typeof a === "string" ? parseInt(a, 10) : a;
  return n > 0 ? 100 / (n + 100) : Math.abs(n) / (Math.abs(n) + 100);
}
function parlayOdds(legs) {
  if (!legs.length) return { decimal: 1, american: "+100" };
  const dec = legs.reduce((p, l) => p * americanToDecimal(l.odds), 1);
  return { decimal: dec, american: decimalToAmerican(dec) };
}

function gradeFor(conf) {
  if (conf >= 90) return "A+";
  if (conf >= 85) return "A";
  if (conf >= 80) return "A-";
  if (conf >= 75) return "B+";
  if (conf >= 70) return "B";
  return "B-";
}

// Grade reliability starts EMPTY — real numbers accrue from settled bets (history.json).
// Until then the UI shows "building track record" instead of a fake hit rate. That honesty
// is the whole point: we don't invent a 71% we haven't earned.
const DWD_GRADE_INFO = {
  legend: "Grades reflect edge size, data depth, and how much the sharp market agrees.",
  records: {}
};
function gradeRecord(conf) { return DWD_GRADE_INFO.records[gradeFor(conf)]; }

// Fetch the engine's output and expose it as the globals the app reads.
async function loadDwdData() {
  const res = await fetch("picks.json?ts=" + Date.now());
  if (!res.ok) throw new Error("picks.json " + res.status);
  const d = await res.json();
  // The hero is ONLY a genuine in-band (-125/+125) pick. No falling back to a board pick
  // (e.g. a -200 favorite) — that violated the "top pick stays in the fair-odds band" rule.
  const lock = d.lock || null;
  const picks = lock
    ? [lock, ...(d.picks || []).filter((p) => p.id !== lock.id)]
    : (d.picks || []);
  Object.assign(window, {
    DWD_LOCK: lock,
    DWD_PICKS: picks,
    DWD_RECORD: d.record || { lockStreak: 0, last10: "0-0" },
    DWD_SPECIAL: d.special || null,
    DWD_DESK_NOTES: (d.deskNotes && d.deskNotes.length) ? d.deskNotes : ["Bet the math, not the mascot."],
    DWD_LAST_UPDATED: d.lastUpdated || "—",
    DWD_EDGES_SCANNED: d.edgesScanned || 0
  });
  // real grade reliability from settled bets (empty until enough settle -> UI shows "building")
  if (d.gradeRecords) DWD_GRADE_INFO.records = d.gradeRecords;
  window.DWD_CLV = d.clvSummary || null;
  window.DWD_ATTRIBUTION = d.attribution || [];
  return d;
}

Object.assign(window, {
  loadDwdData, gradeFor, DWD_GRADE_INFO, gradeRecord,
  americanToDecimal, decimalToAmerican, impliedProb, parlayOdds,
});
