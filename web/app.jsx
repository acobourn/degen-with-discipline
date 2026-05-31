// app.jsx — Degen with Discipline
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

const TAGLINES = {
  "Reckless energy. Ruthless math.": "RECKLESS ENERGY · RUTHLESS MATH",
  "Degen instincts. Disciplined edge.": "DEGEN INSTINCTS · DISCIPLINED EDGE",
  "We do the math. You do the damage.": "WE DO THE MATH · YOU DO THE DAMAGE",
  "Chaos, calculated.": "CHAOS, CALCULATED",
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "tagline": "Reckless energy. Ruthless math.",
  "whyStyle": "bars",
  "lockStyle": "hero",
  "accent": "money",
  "showRecord": true,
  "animate": true
}/*EDITMODE-END*/;

const ACCENTS = {
  money:     { green: "#22e07a", green2: "#36b85f", red: "#ff4d4d", gold: "#ffc24b", glow: "rgba(34,224,122,0.22)" },
  neon:      { green: "#2bf0c0", green2: "#19c4d6", red: "#ff3d6e", gold: "#c9a6ff", glow: "rgba(43,240,192,0.22)" },
  broadcast: { green: "#3ad17a", green2: "#2aa0e0", red: "#ff5a3c", gold: "#ffd23c", glow: "rgba(58,160,224,0.22)" },
};

function applyAccent(name) {
  const a = ACCENTS[name] || ACCENTS.money;
  const r = document.documentElement.style;
  r.setProperty("--green", a.green);
  r.setProperty("--green-2", a.green2);
  r.setProperty("--red", a.red);
  r.setProperty("--gold", a.gold);
  r.setProperty("--glow", a.glow);
}

// Shown when no edge clears the guardrails — sitting out IS the disciplined play.
function NoLock() {
  return (
    <section className="lock" data-screen-label="No Lock">
      <div className="lock-inner" style={{ textAlign: "center" }}>
        <div className="lock-tag" style={{ margin: "0 auto 18px" }}>
          <span className="lock-tag-dot"></span><span className="mono">NO LOCK TODAY</span>
        </div>
        <p className="lock-take" style={{ margin: "0 auto 14px" }}>
          No edge cleared our guardrails right now. The disciplined play is to <b>sit this slate
          out</b> — forcing a bet is how bankrolls die. Check back before the next games.
        </p>
        <div className="mono dim" style={{ fontSize: "11px" }}>
          The model scanned the board and found nothing worth your money. That's a feature, not a bug.
        </div>
      </div>
    </section>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [run, setRun] = useStateA(false);
  const [sort, setSort] = useStateA("edge");
  const [aOnly, setAOnly] = useStateA(false);
  const slip = useSlip();

  useEffectA(() => { applyAccent(t.accent); }, [t.accent]);
  useEffectA(() => {
    const el = document.getElementById("tagline");
    if (el) el.textContent = TAGLINES[t.tagline] || t.tagline;
  }, [t.tagline]);
  useEffectA(() => {
    const id = setTimeout(() => setRun(true), 80);
    return () => clearTimeout(id);
  }, []);

  const animate = t.animate && run;

  const picks = useMemoA(() => {
    let list = DWD_PICKS.slice();
    if (aOnly) list = list.filter((p) => p.confidence >= 80);
    if (sort === "edge") list = list.sort((a, b) => b.confidence - a.confidence);
    return list;
  }, [sort, aOnly]);

  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <div className="topbar-right">
          <span className="live-dot"></span>
          <span className="mono dim">UPDATED {DWD_LAST_UPDATED}</span>
        </div>
      </header>

      <div className="statusline">
        <Countdown />
        <NextScan />
        <DeskNote />
      </div>

      <main className="main">
        {DWD_LOCK
          ? <LockCard lock={DWD_LOCK} whyStyle={t.whyStyle} lockStyle={t.lockStyle} run={animate} slip={slip} />
          : <NoLock />}

        {t.showRecord && <RecordStrip record={DWD_RECORD} />}

        <div className="section-head">
          <h2 className="section-title">TODAY'S BEST <span className="dim">BY SPORT</span></h2>
          <span className="mono dim section-note">tap any card for the math</span>
        </div>

        <SortBar sort={sort} setSort={setSort} aOnly={aOnly} setAOnly={setAOnly} count={picks.length} />

        <div className="picks">
          {picks.map((p) => (
            <PickCard key={p.id} pick={p} whyStyle={t.whyStyle} run={animate} slip={slip} />
          ))}
          {picks.length === 0 && (
            <div className="empty mono">No A-grades on the board right now. Discipline means sitting one out.</div>
          )}
        </div>

        {DWD_SPECIAL && <DegenSpecial special={DWD_SPECIAL} slip={slip} />}

        <footer className="foot">
          <div className="foot-line mono">DEGEN <span className="brand-amp">with</span> DISCIPLINE</div>
          <div className="mono" style={{ margin: "12px 0", fontSize: "12px" }}>
            <a href="boost.html" style={{ color: "var(--green)", textDecoration: "none", marginRight: "18px" }}>⚡ Boost Evaluator →</a>
            <a href="History.html" style={{ color: "var(--ink-dim)", textDecoration: "none" }}>Full history →</a>
          </div>
          <p className="foot-disc mono">
            Picks are model output, not financial advice. The model is confident, not psychic.
            Bet what you can afford to lose, you beautiful degenerate. 21+. If it stops being fun, it's done — 1-800-GAMBLER.
          </p>
        </footer>
      </main>

      <BetSlip slip={slip} />

      <TweaksPanel>
        <TweakSection label="The 'why' / data presentation" />
        <TweakRadio label="Data story" value={t.whyStyle}
          options={["minimal", "chips", "bars", "terminal"]}
          onChange={(v) => setTweak("whyStyle", v)} />
        <TweakSection label="Lock of the Day treatment" />
        <TweakRadio label="Style" value={t.lockStyle}
          options={["hero", "vault", "spotlight"]}
          onChange={(v) => setTweak("lockStyle", v)} />
        <TweakSection label="Look & feel" />
        <TweakRadio label="Accent" value={t.accent}
          options={["money", "neon", "broadcast"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSelect label="Tagline" value={t.tagline}
          options={Object.keys(TAGLINES)}
          onChange={(v) => setTweak("tagline", v)} />
        <TweakToggle label="Record strip" value={t.showRecord} onChange={(v) => setTweak("showRecord", v)} />
        <TweakToggle label="Entrance animation" value={t.animate} onChange={(v) => setTweak("animate", v)} />
      </TweaksPanel>
    </div>
  );
}

// Load the engine's picks.json, then mount. (Serve over http — fetch needs it.)
window.loadDwdData().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}).catch((e) => {
  document.getElementById("root").innerHTML =
    '<p style="color:#97a39c;font-family:monospace;padding:40px;max-width:680px;margin:40px auto;line-height:1.7">Could not load <b>picks.json</b>.<br/>Run the engine (<code>cd engine &amp;&amp; npm run run:engine</code>) and serve over http (<code>npx serve web</code>) — not <code>file://</code>.</p>';
  console.error(e);
});
