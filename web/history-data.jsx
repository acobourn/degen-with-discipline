// history-data.jsx — past picks for the track-record page
const HIST = [
  { date: "May 29", sport: "MLB", matchup: "Pirates @ Cubs",        pick: "Paul Skenes Over 6.5 K",   odds: "-130", grade: "A+", result: "W", lock: true },
  { date: "May 29", sport: "NBA", matchup: "Celtics @ Knicks",      pick: "Celtics -6.5",             odds: "-110", grade: "A",  result: "W" },
  { date: "May 29", sport: "NHL", matchup: "Panthers @ Hurricanes", pick: "Panthers ML",              odds: "-120", grade: "A-", result: "W" },
  { date: "May 29", sport: "TEN", matchup: "Sabalenka vs Andreeva", pick: "Sabalenka -4.5 games",     odds: "-120", grade: "A",  result: "L" },
  { date: "May 29", sport: "SOC", matchup: "LAFC vs Seattle",       pick: "Under 2.5 Goals",          odds: "-115", grade: "B+", result: "W" },

  { date: "May 28", sport: "NBA", matchup: "Pacers @ Cavaliers",    pick: "Pacers +3.5",              odds: "-110", grade: "A",  result: "W", lock: true },
  { date: "May 28", sport: "MLB", matchup: "Dodgers @ Padres",      pick: "Yamamoto Over 6.5 K",      odds: "-115", grade: "A-", result: "W" },
  { date: "May 28", sport: "NHL", matchup: "Stars @ Oilers",        pick: "Over 5.5 Goals",           odds: "-105", grade: "B+", result: "L" },
  { date: "May 28", sport: "TEN", matchup: "Alcaraz vs Dimitrov",   pick: "Alcaraz -5.5 games",       odds: "-130", grade: "A",  result: "W" },
  { date: "May 28", sport: "SOC", matchup: "Inter Miami vs Cincy",  pick: "Over 2.5 Goals",           odds: "-125", grade: "B",  result: "W" },

  { date: "May 27", sport: "NHL", matchup: "Hurricanes @ Panthers", pick: "Panthers -1.5",            odds: "+145", grade: "A",  result: "W", lock: true },
  { date: "May 27", sport: "MLB", matchup: "Yankees @ Astros",      pick: "Yankees ML",               odds: "-125", grade: "B+", result: "L" },
  { date: "May 27", sport: "NBA", matchup: "Thunder @ Timberwolves",pick: "Thunder -4.5",             odds: "-110", grade: "A-", result: "W" },
  { date: "May 27", sport: "TEN", matchup: "Gauff vs Kostyuk",      pick: "Gauff in straight sets",   odds: "-160", grade: "A+", result: "W" },
  { date: "May 27", sport: "SOC", matchup: "Columbus vs Orlando",   pick: "Columbus -0.5",            odds: "-120", grade: "B",  result: "W" },

  { date: "May 26", sport: "TEN", matchup: "Djokovic vs Norrie",    pick: "Djokovic in straight sets",odds: "-200", grade: "A",  result: "W", lock: true },
  { date: "May 26", sport: "MLB", matchup: "Braves @ Mets",         pick: "Over 8.5 Runs",            odds: "-110", grade: "B+", result: "L" },
  { date: "May 26", sport: "NBA", matchup: "Knicks @ Celtics",      pick: "Under 215.5",              odds: "-110", grade: "A-", result: "W" },
  { date: "May 26", sport: "NHL", matchup: "Oilers @ Stars",        pick: "McDavid Over 0.5 Goals",   odds: "+130", grade: "B",  result: "W" },
  { date: "May 26", sport: "SOC", matchup: "Nashville vs Atlanta",  pick: "Over 2.5 Goals",           odds: "-115", grade: "B-", result: "L" },

  { date: "May 25", sport: "MLB", matchup: "Phillies @ Nationals",  pick: "Wheeler Over 6.5 K",       odds: "-120", grade: "A+", result: "L", lock: true },
  { date: "May 25", sport: "NBA", matchup: "Cavaliers @ Pacers",    pick: "Pacers ML",                odds: "-130", grade: "A",  result: "L" },
  { date: "May 25", sport: "NHL", matchup: "Canes @ Panthers",      pick: "Under 5.5 Goals",          odds: "-115", grade: "B+", result: "W" },
  { date: "May 25", sport: "TEN", matchup: "Swiatek vs Bouzkova",   pick: "Swiatek -6.5 games",       odds: "-140", grade: "A+", result: "W" },
  { date: "May 25", sport: "SOC", matchup: "Galaxy vs LAFC",        pick: "LAFC Draw No Bet",         odds: "-110", grade: "B",  result: "L" },

  { date: "May 24", sport: "NBA", matchup: "Timberwolves @ Thunder",pick: "Thunder -5.5",             odds: "-110", grade: "A",  result: "W", lock: true },
  { date: "May 24", sport: "MLB", matchup: "Rays @ Red Sox",        pick: "Under 8.5 Runs",           odds: "-105", grade: "B+", result: "W" },
  { date: "May 24", sport: "NHL", matchup: "Panthers @ Hurricanes", pick: "Panthers ML",              odds: "-115", grade: "A-", result: "W" },
  { date: "May 24", sport: "TEN", matchup: "Alcaraz vs Fognini",    pick: "Alcaraz in straight sets", odds: "-300", grade: "A+", result: "W" },
  { date: "May 24", sport: "SOC", matchup: "Austin vs Dallas",      pick: "Over 2.5 Goals",           odds: "-120", grade: "B-", result: "L" },
];

const HIST_SPORTS = ["ALL", "MLB", "NBA", "NHL", "SOC", "TEN"];

// Calibrated hit-rate by grade over a 90-day sample (matches the model's grade claims).
const GRADE_RELIABILITY = [
  { grade: "A+", pct: 71, rec: "of 58 picks" },
  { grade: "A",  pct: 64, rec: "of 91 picks" },
  { grade: "A-", pct: 61, rec: "of 86 picks" },
  { grade: "B+", pct: 57, rec: "of 74 picks" },
  { grade: "B",  pct: 54, rec: "of 63 picks" },
  { grade: "B-", pct: 52, rec: "of 40 picks" },
];

function amDec(a){ const n=parseInt(a,10); return n>0?n/100+1:100/Math.abs(n)+1; }

// summarize a set of picks: W-L, win%, ROI (1u flat)
function summarize(list){
  let w=0,l=0,profit=0;
  list.forEach(p=>{
    if(p.result==="W"){ w++; profit+=amDec(p.odds)-1; }
    else if(p.result==="L"){ l++; profit-=1; }
  });
  const settled=w+l;
  return { w, l, settled, winPct: settled?Math.round(w/settled*100):0, roi: profit, units: list.length };
}

function gradeSummary(){
  const order=["A+","A","A-","B+","B","B-"];
  return order.map(g=>{
    const s=summarize(HIST.filter(p=>p.grade===g));
    return { grade:g, ...s };
  }).filter(x=>x.settled>0);
}

Object.assign(window, { HIST, HIST_SPORTS, GRADE_RELIABILITY, summarize, gradeSummary, amDec });
