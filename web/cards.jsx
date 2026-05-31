// cards.jsx — Lock hero, pick rows, header, record strip
const { useState: useStateC } = React;

// Build a slip leg from a pick (lock + its MLB twin share one id)
function legFor(p) {
  return { id: p.isLock ? "lock" : p.id, label: p.pick, odds: p.odds, sport: p.sport };
}

/* ============ LOCK OF THE DAY (3 treatments) ============ */
function LockCard({ lock, whyStyle, lockStyle, run, slip }) {
  const dp = useCountUp(lock.dataPoints, run);
  const [open, setOpen] = useStateC(false);
  const [gradeOpen, setGradeOpen] = useStateC(false);
  const leg = legFor(lock);
  const tailed = slip.has(leg.id);

  const field = DWD_PICKS.filter((p) => !p.isLock)
    .sort((a, b) => b.confidence - a.confidence).slice(0, 3);

  return (
    <section className={"lock lock-" + lockStyle} data-screen-label="Lock of the Day">
      {lockStyle === "vault" && <div className="vault-ring" aria-hidden="true"></div>}
      {lockStyle === "spotlight" && <div className="spot-beam" aria-hidden="true"></div>}
      <div className="lock-inner">
        <div className="lock-head">
          <div className="lock-tag">
            <span className="lock-tag-dot"></span>
            <span className="mono">DEGEN'S TOP PICK</span>
          </div>
          <div className="rank mono">#1 <span className="rank-sub">/ {DWD_EDGES_SCANNED} EDGES</span></div>
        </div>

        <div className="lock-context">
          <SportBadge sport={lock.sport} size="lg" />
          <div className="lock-ctx-text">
            <div className="lock-matchup">{lock.matchup}</div>
            <div className="mono dim lock-when">{lock.context}</div>
          </div>
        </div>

        <PickLine pick={lock} big />
        <LineMovement open={lock.openOdds} now={lock.odds} />

        <p className="lock-take">{lock.takeShort}</p>

        <div className="field">
          <span className="mono field-label">WHY IT BEAT THE FIELD</span>
          <div className="field-rows">
            {field.map((f, i) => (
              <div className="field-row" key={f.id}>
                <span className="mono field-rank">#{i + 2}</span>
                <SportBadge sport={f.sport} size="sm" />
                <span className="field-pick">{f.pick}</span>
                <EdgeGrade conf={f.confidence} />
              </div>
            ))}
          </div>
          <span className="mono field-foot">Top of {DWD_EDGES_SCANNED} edges scanned — highest grade, biggest value gap.</span>
        </div>

        <div className="lock-stats">
          <div className="lock-grade">
            <EdgeGrade conf={lock.confidence} big />
            <button className="grade-how mono" onClick={() => setGradeOpen(!gradeOpen)}>
              how we grade {gradeOpen ? "▲" : "▼"}
            </button>
          </div>
          <div className="lock-hit">
            <span className="lock-hit-num mono green">+{(lock.evPct * 100).toFixed(1)}%</span>
            <span className="mono dim">model edge · +EV</span>
          </div>
          <div className="lock-payout">
            <span className="lock-payout-num mono">{lock.payoutNote.split("→")[1].trim()}</span>
            <span className="mono dim">on $100</span>
          </div>
        </div>

        {gradeOpen && <GradeExplainer pick={lock} />}

        <ConfidenceMeter conf={lock.confidence} run={run} />
        <div className="dp">
          <span className="dp-num mono">{dp.toLocaleString()}</span>
          <span className="dp-label mono">data points crunched to find this</span>
        </div>

        <div className="lock-actions">
          <TailButton on={tailed} onClick={() => slip.toggle(leg)} />
          <button className="reveal" onClick={() => setOpen(!open)}>
            {open ? "Hide the math" : "Show me the math"}
            <span className={"reveal-arrow" + (open ? " open" : "")}>↓</span>
          </button>
        </div>

        {open && (
          <div className="lock-why">
            <ValueMeter fairProb={lock.fairProb} odds={lock.odds} />
            <WhyBlock pick={lock} whyStyle={whyStyle === "minimal" ? "bars" : whyStyle} run={run} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ============ PER-SPORT PICK ROW ============ */
function PickCard({ pick, whyStyle, run, slip }) {
  const [open, setOpen] = useStateC(false);
  const leg = legFor(pick);
  const tailed = slip.has(leg.id);
  return (
    <article className={"pcard" + (open ? " open" : "")} data-screen-label={"Pick: " + pick.sport}>
      <button className="pcard-head" onClick={() => setOpen(!open)}>
        <div className="pcard-left">
          <SportBadge sport={pick.sport} />
          <div className="pcard-id">
            <div className="pcard-matchup">{pick.matchup}</div>
            <div className="mono dim pcard-league">{pick.league}</div>
          </div>
        </div>
        <EdgeGrade conf={pick.confidence} />
      </button>

      <div className="pcard-pick">
        <div className="pcard-pickmain">
          {pick.isLock && <span className="lockmini mono">★ DEGEN'S TOP PICK</span>}
          <span className="pick-text">{pick.pick}</span>
        </div>
        <div className="pcard-pickmeta">
          <span className="bettype mono">{pick.betType}</span>
          <span className="odds mono">{pick.odds}</span>
        </div>
      </div>

      <LineMovement open={pick.openOdds} now={pick.odds} />
      <p className="pcard-take">{pick.takeShort}</p>

      <div className="pcard-foot">
        <div className="dp dp-mini">
          <span className="dp-num mono">{pick.dataPoints.toLocaleString()}</span>
          <span className="dp-label mono">data points</span>
        </div>
        <div className="pcard-actions">
          <TailButton on={tailed} onClick={() => slip.toggle(leg)} small />
          <button className="reveal reveal-mini" onClick={() => setOpen(!open)}>
            {open ? "Hide math" : "The math"}
            <span className={"reveal-arrow" + (open ? " open" : "")}>↓</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="pcard-why">
          <ValueMeter fairProb={pick.fairProb} odds={pick.odds} />
          <GradeExplainer pick={pick} />
          <ConfidenceMeter conf={pick.confidence} run={run} />
          <WhyBlock pick={pick} whyStyle={whyStyle} run={run} />
        </div>
      )}
    </article>
  );
}

/* ============ HEADER / WORDMARK ============ */
function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <img src="assets/logo-mark.png" alt="Degen with Discipline" className="brand-img" />
      </div>
      <div className="brand-words">
        <div className="brand-name">DEGEN <span className="brand-amp">with</span> DISCIPLINE</div>
        <div className="brand-tag mono" id="tagline"></div>
      </div>
    </div>
  );
}

/* ============ RECORD / DISCIPLINE STRIP (compact) ============ */
function RecordStrip({ record }) {
  return (
    <div className="record">
      <div className="rec-stat">
        <span className="rec-num mono green">{record.lockStreak}</span>
        <span className="rec-lab mono">lock streak</span>
      </div>
      <span className="rec-dot"></span>
      <div className="rec-stat">
        <span className="rec-num mono">{record.last10}</span>
        <span className="rec-lab mono">last 10 locks</span>
      </div>
      <a className="rec-history mono" href="History.html">Full history →</a>
    </div>
  );
}

Object.assign(window, { LockCard, PickCard, Brand, RecordStrip, legFor });
