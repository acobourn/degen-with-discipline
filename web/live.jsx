// live.jsx — live-feeling widgets
const { useState: useStateL, useEffect: useEffectL, useRef: useRefL } = React;

/* ---------- line movement: open -> now ---------- */
function LineMovement({ open, now }) {
  const io = impliedProb(open), inw = impliedProb(now);
  const steam = inw >= io; // price got more expensive => market agrees with us
  const movedPts = Math.abs(Math.round((inw - io) * 1000) / 10);
  return (
    <div className={"linemove " + (steam ? "lm-steam" : "lm-value")}>
      <span className="mono lm-open">{open}</span>
      <span className="lm-arrow">{steam ? "↑" : "↓"}</span>
      <span className="mono lm-now">{now}</span>
      <span className="lm-tag mono">{steam ? "STEAMING" : "VALUE LEFT"}</span>
      <span className="mono lm-pts">{movedPts ? (steam ? "+" : "−") + movedPts + "%" : "flat"}</span>
    </div>
  );
}

/* ---------- value meter: de-vigged fair value vs the price you're offered ---------- */
// Honest edge = consensus FAIR probability minus what THIS price implies. Small and real.
function ValueMeter({ fairProb, odds }) {
  const market = Math.round(impliedProb(odds) * 100);
  const model = fairProb != null ? Math.round(fairProb * 100) : market;
  const edge = Math.max(0, model - market);
  const [grow, setGrow] = useStateL(false);
  useEffectL(() => { const id = setTimeout(() => setGrow(true), 120); return () => clearTimeout(id); }, []);
  return (
    <div className="vmeter">
      <div className="vmeter-head">
        <span className="mono dim">THE EDGE</span>
        <span className="mono vmeter-edge">+{edge} pts of value</span>
      </div>
      <div className="vmeter-track">
        <div className="vmeter-market" style={{ width: (grow ? market : 0) + "%" }}>
          <span className="vmeter-cap mono">PRICE IMPLIES {market}%</span>
        </div>
        <div className="vmeter-edgefill" style={{ width: (grow ? edge : 0) + "%" }}></div>
        <div className="vmeter-tick" style={{ left: (grow ? model : 0) + "%" }}>
          <span className="vmeter-cap mono green">FAIR {model}%</span>
        </div>
      </div>
      <p className="vmeter-note mono">This price implies {market}%; the de-vigged market consensus says {model}%. That ~{edge}-pt gap is the edge — small and real, not magic.</p>
    </div>
  );
}

/* ---------- countdown to first lock ---------- */
function pad(n) { return String(n).padStart(2, "0"); }
function Countdown() {
  const targetRef = useRefL(null);
  if (targetRef.current === null) {
    let saved = Number(localStorage.getItem("dwd_target") || 0);
    if (!saved || saved < Date.now()) { saved = Date.now() + (3 * 3600 + 47 * 60 + 12) * 1000; localStorage.setItem("dwd_target", String(saved)); }
    targetRef.current = saved;
  }
  const [left, setLeft] = useStateL(targetRef.current - Date.now());
  useEffectL(() => {
    const id = setInterval(() => setLeft(targetRef.current - Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const live = left <= 0;
  const s = Math.max(0, Math.floor(left / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (
    <div className="countdown">
      <span className="cd-dot"></span>
      <span className="mono cd-label">{live ? "FIRST LOCK IS" : "FIRST LOCK LOCKS IN"}</span>
      <span className="mono cd-time">{live ? "LIVE NOW" : pad(h) + ":" + pad(m) + ":" + pad(sec)}</span>
    </div>
  );
}

/* ---------- house voice ---------- */
function DeskNote() {
  const [i, setI] = useStateL(() => Math.floor(Math.random() * DWD_DESK_NOTES.length));
  const [vis, setVis] = useStateL(true);
  useEffectL(() => {
    const id = setInterval(() => {
      setVis(false);
      setTimeout(() => { setI((p) => (p + 1) % DWD_DESK_NOTES.length); setVis(true); }, 350);
    }, 6500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="desk">
      <span className="mono desk-label">FROM THE DESK</span>
      <span className={"desk-quip" + (vis ? " in" : "")}>{DWD_DESK_NOTES[i]}</span>
    </div>
  );
}

Object.assign(window, { LineMovement, ValueMeter, Countdown, DeskNote });
