// slip.jsx — bet slip, Degen Special, sort/filter bar
const { useState: useStateS, useEffect: useEffectS } = React;

function money(n) { return "$" + Math.round(n).toLocaleString(); }

/* ---------- slip state ---------- */
function useSlip() {
  const [legs, setLegs] = useStateS(() => {
    try { return JSON.parse(localStorage.getItem("dwd_slip") || "[]"); } catch (e) { return []; }
  });
  useEffectS(() => { localStorage.setItem("dwd_slip", JSON.stringify(legs)); }, [legs]);
  const has = (id) => legs.some((l) => l.id === id);
  const toggle = (leg) => setLegs((p) => p.some((l) => l.id === leg.id) ? p.filter((l) => l.id !== leg.id) : [...p, leg]);
  const remove = (id) => setLegs((p) => p.filter((l) => l.id !== id));
  const addMany = (newLegs) => setLegs((p) => {
    const ids = new Set(p.map((l) => l.id));
    return [...p, ...newLegs.filter((l) => !ids.has(l.id))];
  });
  const clear = () => setLegs([]);
  return { legs, has, toggle, remove, addMany, clear };
}

/* ---------- tail button ---------- */
function TailButton({ on, onClick, small }) {
  return (
    <button className={"tail" + (on ? " tailed" : "") + (small ? " tail-sm" : "")}
      onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {on ? "Tailed ✓" : "Tail it"}
    </button>
  );
}

/* ---------- the Degen Special ---------- */
function DegenSpecial({ special, slip }) {
  const po = parlayOdds(special.legs);
  const allOn = special.legs.every((l) => slip.has(l.id));
  return (
    <section className="special" data-screen-label="Degen Special">
      <div className="special-glow" aria-hidden="true"></div>
      <div className="special-inner">
        <div className="special-top">
          <div>
            <div className="special-kicker mono">★ THE DEGEN SPECIAL</div>
            <h3 className="special-name">{special.name}</h3>
            <div className="mono dim special-sub">{special.subtitle}</div>
          </div>
          <div className="special-odds">
            <span className="special-odds-num mono">{po.american}</span>
            <span className="mono dim">parlay</span>
          </div>
        </div>
        <div className="special-legs">
          {special.legs.map((l, i) => (
            <div className="special-leg" key={l.id}>
              <span className="special-leg-n mono">{i + 1}</span>
              <span className="special-leg-label">{l.label}</span>
              <span className="odds mono special-leg-odds">{l.odds}</span>
            </div>
          ))}
        </div>
        <p className="special-take">{special.take}</p>
        <div className="special-foot">
          <div className="special-payout">
            <span className="mono dim">$10 returns</span>
            <span className="special-payout-num mono">{money(10 * po.decimal)}</span>
            <span className="mono dim">bet small, brag big</span>
          </div>
          <button className={"tail tail-special" + (allOn ? " tailed" : "")}
            onClick={() => slip.addMany(special.legs)}>
            {allOn ? "In your slip ✓" : "Tail the Special"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- sort / filter bar ---------- */
function SortBar({ sort, setSort, aOnly, setAOnly, count }) {
  return (
    <div className="sortbar">
      <div className="sortbar-left">
        <span className="mono dim sortbar-count">{count} EDGES</span>
      </div>
      <div className="sortbar-right">
        <div className="seg">
          <button className={"seg-btn" + (sort === "edge" ? " on" : "")} onClick={() => setSort("edge")}>Edge</button>
          <button className={"seg-btn" + (sort === "sport" ? " on" : "")} onClick={() => setSort("sport")}>Sport</button>
        </div>
        <button className={"agrade" + (aOnly ? " on" : "")} onClick={() => setAOnly(!aOnly)}>
          <span className="agrade-box">{aOnly ? "✓" : ""}</span> A-grades only
        </button>
      </div>
    </div>
  );
}

/* ---------- sticky bet slip ---------- */
function BetSlip({ slip }) {
  const [open, setOpen] = useStateS(false);
  const [stake, setStake] = useStateS(() => Number(localStorage.getItem("dwd_stake") || 25));
  const [placed, setPlaced] = useStateS(false);
  useEffectS(() => { localStorage.setItem("dwd_stake", String(stake)); }, [stake]);
  useEffectS(() => { if (slip.legs.length === 0) { setOpen(false); setPlaced(false); } }, [slip.legs.length]);

  if (slip.legs.length === 0) return null;
  const po = parlayOdds(slip.legs);
  const payout = stake * po.decimal;
  const single = slip.legs.length === 1;

  return (
    <div className="slipwrap">
      <div className={"slip" + (open ? " open" : "")}>
        <button className="slip-bar" onClick={() => setOpen(!open)}>
          <div className="slip-bar-left">
            <span className="slip-count mono">{slip.legs.length}</span>
            <span className="slip-bar-label">{single ? "Single" : slip.legs.length + "-Leg Parlay"}</span>
            <span className="slip-bar-odds mono">{po.american}</span>
          </div>
          <div className="slip-bar-right">
            <span className="mono slip-bar-payout">{money(stake)} → <b>{money(payout)}</b></span>
            <span className={"slip-chev" + (open ? " up" : "")}>↑</span>
          </div>
        </button>

        {open && (
          <div className="slip-body">
            <div className="slip-legs">
              {slip.legs.map((l) => (
                <div className="slip-leg" key={l.id}>
                  {l.sport && <SportBadge sport={l.sport} size="sm" />}
                  <span className="slip-leg-label">{l.label}</span>
                  <span className="odds mono slip-leg-odds">{l.odds}</span>
                  <button className="slip-x" onClick={() => slip.remove(l.id)}>×</button>
                </div>
              ))}
            </div>

            <div className="slip-stake">
              <span className="mono dim">STAKE</span>
              <div className="stake-chips">
                {[10, 25, 50, 100].map((v) => (
                  <button key={v} className={"stake-chip mono" + (stake === v ? " on" : "")} onClick={() => setStake(v)}>${v}</button>
                ))}
              </div>
            </div>

            <div className="slip-totals">
              <div className="slip-total-row">
                <span className="mono dim">Parlay odds</span><span className="mono">{po.american}</span>
              </div>
              <div className="slip-total-row">
                <span className="mono dim">To win</span><span className="mono green">{money(payout - stake)}</span>
              </div>
              <div className="slip-total-row big">
                <span className="mono">Payout</span><span className="mono green">{money(payout)}</span>
              </div>
            </div>

            <button className={"slip-place" + (placed ? " done" : "")} onClick={() => setPlaced(true)}>
              {placed ? "Slip copied — go ruin a bookie's night" : "Lock in the slip"}
            </button>
            <button className="slip-clear" onClick={() => slip.clear()}>Clear slip</button>
            <p className="slip-disc mono">For entertainment. We don't take bets — we just do the math. 21+. 1-800-GAMBLER.</p>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { useSlip, TailButton, DegenSpecial, SortBar, BetSlip, money });
