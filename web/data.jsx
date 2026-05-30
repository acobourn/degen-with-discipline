// data.jsx — Degen with Discipline / pick data for May 30, 2026

const DWD_LAST_UPDATED = "9:41 AM ET";
const DWD_EDGES_SCANNED = 47; // how many edges the model ranked to crown the Lock

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

const DWD_LOCK = {
  id: "lock",
  sport: "MLB",
  sportLabel: "Baseball",
  league: "MLB",
  context: "Tigers @ White Sox · 8:10 PM ET",
  matchup: "Detroit Tigers vs Chicago White Sox",
  pick: "Tarik Skubal — Over 7.5 Strikeouts",
  betType: "Strikeout Prop",
  odds: "-115",
  openOdds: "-105",
  payoutNote: "$100 → $187",
  confidence: 93,
  units: 3,
  takeShort: "The nastiest arm in baseball vs the league's whiffiest lineup. This is free money wearing a disguise.",
  takeLong:
    "Skubal is running a 35% strikeout rate and the White Sox lead the majors in K% against lefties (28.4%). Tonight's plate ump runs the widest zone in the league, the air is dry, and Skubal's last five starts: 9, 11, 8, 10, 13 punchies. We needed 8. The model needed a nap.",
  dataPoints: 2341,
  factors: [
    { label: "Pitcher form (K%)", weight: 94, note: "35% K-rate, 5-start avg 10.2 K" },
    { label: "Opponent whiff rate", weight: 88, note: "Worst K% vs LHP in MLB" },
    { label: "Umpire zone", weight: 71, note: "Widest strike zone, +0.6 K/9" },
    { label: "Weather / air", weight: 52, note: "Dry, 64°F, low humidity" },
    { label: "Park & catcher framing", weight: 64, note: "+4% called-strike rate" },
    { label: "Rest & pitch count", weight: 58, note: "5 days rest, leash to 105" },
  ],
};

const DWD_PICKS = [
  { ...DWD_LOCK, id: "mlb", isLock: true },

  {
    id: "tennis",
    sport: "TEN",
    sportLabel: "Tennis",
    league: "Roland Garros · R3",
    context: "Court Philippe-Chatrier · 11:00 AM ET",
    matchup: "Carlos Alcaraz vs Tommy Paul",
    pick: "Alcaraz to win in straight sets",
    betType: "Set Betting",
    odds: "-140",
    openOdds: "-130",
    payoutNote: "$100 → $171",
    confidence: 87,
    units: 2,
    takeShort: "Paul left two hours of his life on a clay court Thursday. Carlos eats tired Americans for brunch.",
    takeLong:
      "Alcaraz is 41–4 on clay over two seasons and owns a 3–0 H2H, all straight sets. Paul needed 4h11m to survive his last match and his serve-hold rate dips hard past the 3-hour mark. Clay neutralizes Paul's biggest weapon. This is a marathon runner against a guy who just ran one.",
    dataPoints: 2010,
    factors: [
      { label: "Clay surface win%", weight: 92, note: "41–4 on clay, 2-yr" },
      { label: "Opponent fatigue", weight: 84, note: "4h11m prev round" },
      { label: "Head-to-head", weight: 78, note: "3–0, all straights" },
      { label: "Serve hold %", weight: 66, note: "Edge +9% on clay" },
      { label: "Recent form", weight: 81, note: "12-1 last 13" },
      { label: "Weather", weight: 44, note: "Warm, slow heavy clay" },
    ],
  },

  {
    id: "nba",
    sport: "NBA",
    sportLabel: "Basketball",
    league: "Conf Finals · Game 5",
    context: "Thunder @ Timberwolves · 8:30 PM ET",
    matchup: "Oklahoma City Thunder vs Minnesota Timberwolves",
    pick: "Thunder -5.5",
    betType: "Spread",
    odds: "-110",
    openOdds: "-118",
    payoutNote: "$100 → $191",
    confidence: 84,
    units: 2,
    takeShort: "Best defense in the league, series lead, and a building full of dread. Cover incoming.",
    takeLong:
      "OKC owns the league's #1 defensive rating and Minnesota's half-court offense craters to 0.91 PPP when the Thunder switch everything. The ref crew tonight calls the 4th-lowest free-throw rate in the playoffs — bad news for a Wolves team that lives at the line. Thunder are 6–1 ATS as a road favorite in the postseason.",
    dataPoints: 1890,
    factors: [
      { label: "Net rating gap", weight: 86, note: "+8.4 differential" },
      { label: "Half-court defense", weight: 90, note: "#1 D-rating, switch-heavy" },
      { label: "Ref crew tendencies", weight: 62, note: "Low FT-rate whistle" },
      { label: "Rest & travel", weight: 49, note: "Even rest, 1 flight" },
      { label: "ATS as road fave", weight: 73, note: "6–1 in playoffs" },
      { label: "Injuries", weight: 55, note: "Wolves G questionable" },
    ],
  },

  {
    id: "nhl",
    sport: "NHL",
    sportLabel: "Hockey",
    league: "Conf Final · Game 4",
    context: "Stars @ Oilers · 8:00 PM ET",
    matchup: "Dallas Stars vs Edmonton Oilers",
    pick: "Oilers Moneyline",
    betType: "Moneyline",
    odds: "-125",
    openOdds: "-135",
    payoutNote: "$100 → $180",
    confidence: 79,
    units: 1,
    takeShort: "When the best player on Earth is mad and rested, you don't bet against him. You tip generously and run.",
    takeLong:
      "Edmonton controls 56% of expected goals at 5-on-5 in this series and their power play is humming at 31%. Dallas is on the second night of travel with a goalie posting an .888 over his last three. The Oilers are home, angry after a Game 3 loss, and McDavid is averaging a point every 14 minutes this round.",
    dataPoints: 1420,
    factors: [
      { label: "Expected goals share", weight: 83, note: "56% xGF at 5v5" },
      { label: "Special teams", weight: 80, note: "PP at 31% this series" },
      { label: "Goalie form", weight: 68, note: "Opp G .888 last 3" },
      { label: "Rest & travel", weight: 58, note: "Stars 2nd night travel" },
      { label: "Home ice", weight: 54, note: "Oilers 7–2 at home" },
      { label: "Star usage", weight: 76, note: "McDavid 1 pt / 14 min" },
    ],
  },

  {
    id: "soccer",
    sport: "SOC",
    sportLabel: "Soccer",
    league: "MLS · Matchday 16",
    context: "Inter Miami vs Orlando City · 7:30 PM ET",
    matchup: "Inter Miami CF vs Orlando City SC",
    pick: "Over 2.5 Total Goals",
    betType: "Total Goals",
    odds: "-120",
    openOdds: "-110",
    payoutNote: "$100 → $183",
    confidence: 76,
    units: 1,
    takeShort: "Messi at home + a derby + a defense made of wet cardboard. Goals are basically a formality.",
    takeLong:
      "Miami average 2.4 goals at home and Orlando concede 1.6 on the road while leaking the 3rd-most big chances in the league. This fixture has gone Over 2.5 in 7 of the last 8 meetings. Add a referee who lets play flow and a forecast with zero rain, and the under is praying for a miracle.",
    dataPoints: 1655,
    factors: [
      { label: "xG for & against", weight: 79, note: "Combined 3.1 xG" },
      { label: "Opponent defense", weight: 82, note: "3rd-most big chances allowed" },
      { label: "Head-to-head O/U", weight: 74, note: "Over in 7 of last 8" },
      { label: "Key availability", weight: 70, note: "Messi & Suárez fit" },
      { label: "Referee profile", weight: 48, note: "Lets play flow" },
      { label: "Weather", weight: 41, note: "Clear, 81°F" },
    ],
  },
];

// The Degen Special — model's parlay of the day. Reckless on purpose.
const DWD_SPECIAL = {
  id: "special",
  name: "The Disciplined Degen",
  subtitle: "3-leg parlay of the day",
  take: "Three of today's strongest favorites stapled together because one unit of fun never killed anybody. Correlation's not perfect, the math says it pays, and the group chat will respect you. Bet 0.5u and act like you didn't.",
  units: 0.5,
  legs: [
    { id: "special-1", refId: "tennis", label: "Alcaraz straight sets", odds: "-140" },
    { id: "special-2", refId: "nba", label: "Thunder -5.5", odds: "-110" },
    { id: "special-3", refId: "nhl", label: "Oilers ML", odds: "-125" },
  ],
};

// House voice — rotating "from the desk" quips.
const DWD_DESK_NOTES = [
  "Bet the math, not the mascot.",
  "We faded our own parlay yesterday. It hit. We're not bitter.",
  "Discipline is just degeneracy with a spreadsheet.",
  "The model doesn't have feelings. That's the entire point.",
  "If your bookie sounds nervous, you're doing it right.",
  "We grade the bet, not the team. Sometimes the math hates your favorite.",
];

// How grades are earned + their historical reliability (transparency).
const DWD_GRADE_INFO = {
  legend: "A+ means a top-decile edge with deep data and the market moving our way.",
  records: {
    "A+": { win: 71, sample: "L90", roi: "+22.4u" },
    "A":  { win: 64, sample: "L90", roi: "+14.1u" },
    "A-": { win: 61, sample: "L90", roi: "+9.7u" },
    "B+": { win: 57, sample: "L90", roi: "+4.2u" },
    "B":  { win: 54, sample: "L90", roi: "+1.8u" },
    "B-": { win: 52, sample: "L90", roi: "+0.6u" },
  },
};
function gradeRecord(conf) { return DWD_GRADE_INFO.records[gradeFor(conf)]; }

const DWD_RECORD = {
  lockStreak: 4,
  last10: "7-3",
  roi: "+18.2%",
  yesterday: [
    { sport: "NBA", pick: "Celtics -6.5", result: "W" },
    { sport: "MLB", pick: "Skenes o6.5 K", result: "W" },
    { sport: "NHL", pick: "Panthers ML", result: "W" },
    { sport: "TEN", pick: "Sabalenka -4.5", result: "L" },
  ],
};

Object.assign(window, {
  DWD_LOCK, DWD_PICKS, DWD_RECORD, DWD_LAST_UPDATED, DWD_EDGES_SCANNED,
  DWD_SPECIAL, DWD_DESK_NOTES, gradeFor,
  DWD_GRADE_INFO, gradeRecord,
  americanToDecimal, decimalToAmerican, impliedProb, parlayOdds,
});
