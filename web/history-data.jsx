// history-data.jsx — loads the REAL track record (settled picks + CLV) from history.json,
// written by the engine. Empty until picks settle — we show an honest "building" state.
let HIST = [];
let HIST_SPORTS = ["ALL"];
let GRADE_RELIABILITY = [];
let HIST_ATTRIBUTION = [];
let HIST_SUMMARY = null;

function amDec(a) { const n = parseInt(a, 10); return n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1; }

// W-L, win%, ROI (1u flat) over a set of picks.
function summarize(list) {
  let w = 0, l = 0, profit = 0;
  list.forEach((p) => {
    if (p.result === "W") { w++; profit += amDec(p.odds) - 1; }
    else if (p.result === "L") { l++; profit -= 1; }
  });
  const settled = w + l;
  return { w, l, settled, winPct: settled ? Math.round(w / settled * 100) : 0, roi: profit, units: list.length };
}

async function loadHistory() {
  try {
    const res = await fetch("history.json?ts=" + Date.now());
    const d = await res.json();
    HIST = d.settled || [];
    HIST_SPORTS = (d.sports && d.sports.length) ? d.sports : ["ALL"];
    GRADE_RELIABILITY = d.gradeReliability || [];
    HIST_ATTRIBUTION = d.attribution || [];
    HIST_SUMMARY = d.summary || null;
  } catch (e) { console.error("history.json load failed", e); }
  Object.assign(window, { HIST, HIST_SPORTS, GRADE_RELIABILITY, HIST_ATTRIBUTION, HIST_SUMMARY });
  return true;
}

Object.assign(window, { summarize, amDec, loadHistory, HIST, HIST_SPORTS, GRADE_RELIABILITY });
