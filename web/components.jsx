// components.jsx — Degen with Discipline UI
const { useState, useEffect, useRef } = React;

/* ---------- animated count-up for the data-point flex ---------- */
function useCountUp(target, run = true, ms = 1100) {
  const [n, setN] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) { setN(target); return; }
    let raf, start;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

/* ---------- sport badge (simple monogram, no fragile SVG) ---------- */
const SPORT_ABBR = { MLB: "MLB", NBA: "NBA", NHL: "NHL", SOC: "SOC", TEN: "TEN" };
function SportBadge({ sport, size = "md" }) {
  return (
    <span className={"sportBadge sb-" + sport + " sb-" + size}>{SPORT_ABBR[sport] || sport}</span>
  );
}

/* ---------- edge grade pill ---------- */
function EdgeGrade({ conf, big }) {
  const g = gradeFor(conf);
  return (
    <span className={"grade " + (big ? "grade-big " : "") + (conf >= 85 ? "grade-hot" : "grade-warm")}>
      <span className="grade-letter">{g}</span>
      <span className="grade-sub">EDGE</span>
    </span>
  );
}

/* ---------- confidence gauge (bar) ---------- */
function ConfidenceMeter({ conf, run }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setW(conf), run ? 250 : 0);
    return () => clearTimeout(id);
  }, [conf, run]);
  return (
    <div className="conf">
      <div className="conf-head">
        <span className="mono dim">MODEL CONFIDENCE</span>
        <span className="mono conf-num">{conf}%</span>
      </div>
      <div className="conf-track">
        <div className="conf-fill" style={{ width: w + "%" }}></div>
      </div>
    </div>
  );
}

/* ---------- factor presentations (the tweakable part) ---------- */
function barColor(w) {
  // green when strong, fading toward amber for weaker contributors
  if (w >= 80) return "var(--green)";
  if (w >= 65) return "var(--green-2)";
  if (w >= 50) return "var(--gold)";
  return "var(--dim-line)";
}

function FactorBars({ factors, dense }) {
  return (
    <div className={"factors" + (dense ? " factors-dense" : "")}>
      {factors.map((f, i) => (
        <div className="factor" key={i}>
          <div className="factor-top">
            <span className="factor-label">{f.label}</span>
            <span className="mono factor-val">{f.weight}</span>
          </div>
          <div className="factor-track">
            <div className="factor-fill" style={{ width: f.weight + "%", background: barColor(f.weight) }}></div>
          </div>
          {f.note && <div className="factor-note mono">{f.note}</div>}
        </div>
      ))}
    </div>
  );
}

function FactorChips({ factors }) {
  return (
    <div className="chips">
      {factors.map((f, i) => (
        <span className="chip" key={i}>
          <span className="chip-dot" style={{ background: barColor(f.weight) }}></span>
          {f.label}
        </span>
      ))}
    </div>
  );
}

function TerminalReadout({ pick, run }) {
  const dp = useCountUp(pick.dataPoints, run);
  return (
    <div className="terminal">
      <div className="term-line"><span className="term-key">model</span> dwd-edge.v4</div>
      <div className="term-line"><span className="term-key">inputs</span> {dp.toLocaleString()} data points</div>
      <div className="term-line"><span className="term-key">grade</span> {gradeFor(pick.confidence)} · conf {pick.confidence}%</div>
      <div className="term-line"><span className="term-key">read</span> <span className="term-read">{pick.takeLong}</span></div>
      <FactorBars factors={pick.factors} dense />
      <div className="term-line term-out"><span className="term-key">output</span> <span className="term-fire">FIRE — {pick.kellyStake != null ? "$" + pick.kellyStake : "tracked"}</span></div>
    </div>
  );
}

/* whyStyle: minimal | chips | bars | terminal */
function WhyBlock({ pick, whyStyle, run }) {
  if (whyStyle === "terminal") return <TerminalReadout pick={pick} run={run} />;
  return (
    <div className="why">
      <p className="why-take">{pick.takeLong}</p>
      {whyStyle === "chips" && <FactorChips factors={pick.factors} />}
      {whyStyle === "bars" && <FactorBars factors={pick.factors} />}
      {whyStyle === "minimal" && (
        <div className="why-min">
          <span className="mono dim">Top driver</span>
          <span className="why-min-driver">{pick.factors[0].label}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- the odds / pick line ---------- */
function PickLine({ pick, big }) {
  return (
    <div className={"pickline" + (big ? " pickline-big" : "")}>
      <div className="pickline-main">
        <span className="pick-text">{pick.pick}</span>
      </div>
      <div className="pickline-meta">
        <span className="bettype mono">{pick.betType}</span>
        <span className="odds mono">{pick.odds}</span>
      </div>
    </div>
  );
}

/* ---------- grade explainer: why it graded what it did ---------- */
function GradeExplainer({ pick }) {
  const market = Math.round(impliedProb(pick.odds) * 100);
  const model = pick.fairProb != null ? Math.round(pick.fairProb * 100) : market;
  const edge = Math.max(0, model - market);
  const g = pick.grade || gradeFor(pick.confidence);
  const rec = gradeRecord(pick.confidence);
  const evTxt = pick.evPct != null ? " (+" + (pick.evPct * 100).toFixed(1) + "% EV)" : "";
  const steam = impliedProb(pick.odds) >= impliedProb(pick.openOdds);
  const rows = [
    { k: "Value edge", v: "Real shot to win: " + model + "% — but this price only pays like " + market + "%. That " + edge + "-pt gap in your favor is your edge" + evTxt },
    { k: "Data depth", v: pick.dataPoints.toLocaleString() + " data points across " + pick.factors.length + " weighted factors" },
    { k: "Market read", v: steam ? "Line is steaming our way (sharp money agrees)" : "Value still sitting on the board" },
    { k: "Track record", v: rec ? (g + " grades win " + rec.win + "% (" + rec.sample + ", " + rec.roi + ")") : "Building track record — real hit-rate shows once enough picks settle." },
  ];
  return (
    <div className="gradex">
      <div className="gradex-head mono">WHY IT GRADES {g}</div>
      <div className="gradex-rows">
        {rows.map((r, i) => (
          <div className="gradex-row" key={i}>
            <span className="gradex-k mono">{r.k}</span>
            <span className="gradex-v">{r.v}</span>
          </div>
        ))}
      </div>
      <p className="gradex-foot mono">Grades run A+ → C. {DWD_GRADE_INFO.legend} Past results don't promise future ones — that's the gambling part.</p>
    </div>
  );
}

Object.assign(window, {
  useCountUp, SportBadge, EdgeGrade, ConfidenceMeter,
  FactorBars, FactorChips, TerminalReadout, WhyBlock, PickLine, barColor, GradeExplainer,
});
