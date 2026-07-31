"use client";

import { useMemo, useState } from "react";
import { AuthGate } from "./AuthGate";

const evidence = [
  { label: "Subscriber growth", value: "+64% YoY", tone: "positive", note: "Domestic subscribers grew rapidly in the prior quarter." },
  { label: "Share price", value: "−42%", tone: "negative", note: "Decline from the July high after a pricing change." },
  { label: "Valuation", value: "Elevated", tone: "neutral", note: "The market still prices in substantial future growth." },
  { label: "Churn warning", value: "+1.0M", tone: "negative", note: "Management expects one million net cancellations." },
];

const risks = ["Valuation compression", "Customer churn", "Execution risk", "Competitive pressure"];

export default function Home() {
  const [action, setAction] = useState("Hold");
  const [allocation, setAllocation] = useState(10);
  const [confidence, setConfidence] = useState(60);
  const [reasoning, setReasoning] = useState("");
  const [selectedRisks, setSelectedRisks] = useState<string[]>(["Customer churn"]);
  const [locked, setLocked] = useState(false);
  const [activeTab, setActiveTab] = useState("Evidence");

  const ready = reasoning.trim().length >= 40 && selectedRisks.length > 0;
  const score = useMemo(() => {
    const process = Math.min(45, 20 + selectedRisks.length * 5 + Math.min(reasoning.trim().length / 20, 15));
    const sizing = allocation <= 15 ? 30 : allocation <= 25 ? 22 : 12;
    const calibration = confidence <= 70 ? 25 : confidence <= 85 ? 18 : 10;
    return Math.round(process + sizing + calibration);
  }, [allocation, confidence, reasoning, selectedRisks]);

  function toggleRisk(risk: string) {
    if (locked) return;
    setSelectedRisks((current) => current.includes(risk) ? current.filter((item) => item !== risk) : [...current, risk]);
  }

  return (
    <AuthGate>
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="DecisionLab home"><span>DL</span> DecisionLab</a>
        <nav aria-label="Primary navigation">
          <a className="active" href="#scenario">Scenarios</a>
          <a href="#method">How it works</a>
          <a href="#progress">My progress</a>
        </nav>
      </header>

      <section className="workspace" id="scenario">
        <div className="scenario-head">
          <div>
            <div className="eyebrow"><span>Scenario 01</span><i /> September 19, 2011</div>
            <h1>A streaming pioneer at a crossroads</h1>
            <p>You are evaluating Netflix after a controversial pricing change. Use only what an investor could have known on this date.</p>
          </div>
          <div className="status"><span className={locked ? "status-dot locked" : "status-dot"} />{locked ? "Decision locked" : "Decision in progress"}</div>
        </div>

        <div className="lab-grid">
          <section className="research-panel">
            <div className="tabs" role="tablist">
              {["Evidence", "Price history", "Timeline"].map((tab) => (
                <button key={tab} className={activeTab === tab ? "selected" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>

            {activeTab === "Evidence" && <div className="evidence-list">
              <div className="context-card">
                <span>Situation brief</span>
                <p>Netflix separated its DVD and streaming plans, effectively raising the price for customers who wanted both. The change triggered public backlash while management remained focused on a streaming-first future.</p>
              </div>
              {evidence.map((item) => <article className="evidence-row" key={item.label}>
                <div><span className={`signal ${item.tone}`} /> <strong>{item.label}</strong><p>{item.note}</p></div>
                <b>{item.value}</b>
              </article>)}
              <div className="source-note">Information frozen at September 19, 2011 · No hindsight included</div>
            </div>}

            {activeTab === "Price history" && <div className="chart-panel">
              <div className="chart-header"><div><span>NASDAQ: NFLX</span><strong>$143.75</strong></div><em>6 months before decision</em></div>
              <div className="bar-chart" aria-label="Illustrative six month price trend">
                {[48,55,61,69,77,84,92,86,73,62,53,44].map((height, i) => <i key={i} style={{height: `${height}%`}} />)}
              </div>
              <div className="chart-axis"><span>APR</span><span>JUN</span><span>AUG</span><span>SEP 19</span></div>
              <p className="chart-note">Adjusted historical prices shown for decision context.</p>
            </div>}

            {activeTab === "Timeline" && <div className="timeline">
              <article><time>JUL 12</time><div><strong>New pricing announced</strong><p>DVD and streaming plans are separated.</p></div></article>
              <article><time>SEP 15</time><div><strong>Forecast revised</strong><p>Subscriber guidance is cut by one million.</p></div></article>
              <article><time>SEP 19</time><div><strong>Your decision point</strong><p>The company announces the Qwikster brand.</p></div></article>
            </div>}
          </section>

          <aside className="decision-panel">
            {!locked ? <>
              <div className="panel-title"><div><span>02</span><h2>Make your decision</h2></div><small>Private until locked</small></div>

              <fieldset><legend>What would you do?</legend><div className="action-grid">
                {["Buy", "Hold", "Sell", "Avoid"].map((item) => <button key={item} className={action === item ? "chosen" : ""} onClick={() => setAction(item)}>{item}</button>)}
              </div></fieldset>

              <label className="range-label"><span>Capital allocation</span><b>{allocation}%</b></label>
              <input type="range" min="0" max="50" value={allocation} onChange={(event) => setAllocation(Number(event.target.value))} aria-label="Capital allocation percentage" />
              <div className="range-scale"><span>0%</span><span>25%</span><span>50%</span></div>

              <label className="text-label" htmlFor="reasoning">Your reasoning <span>{reasoning.length}/500</span></label>
              <textarea id="reasoning" maxLength={500} value={reasoning} onChange={(event) => setReasoning(event.target.value)} placeholder="What evidence matters most? What would change your mind?" />

              <fieldset><legend>Risks you are accepting</legend><div className="risk-grid">
                {risks.map((risk) => <button key={risk} className={selectedRisks.includes(risk) ? "risk chosen" : "risk"} onClick={() => toggleRisk(risk)}><span>{selectedRisks.includes(risk) ? "✓" : "+"}</span>{risk}</button>)}
              </div></fieldset>

              <label className="range-label confidence"><span>Confidence in this decision</span><b>{confidence}%</b></label>
              <input type="range" min="10" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} aria-label="Confidence percentage" />
              <p className="helper">Confidence is not certainty. Estimate honestly.</p>

              <button className="lock-button" disabled={!ready} onClick={() => setLocked(true)}>Lock decision <span>→</span></button>
              {!ready && <p className="requirement">Add at least 40 characters of reasoning and identify a risk.</p>}
            </> : <div className="reveal">
              <div className="reveal-kicker">Outcome revealed</div>
              <h2>Your process score</h2>
              <div className="score-ring" style={{"--score": `${score * 3.6}deg`} as React.CSSProperties}><span>{score}</span><small>/ 100</small></div>
              <div className="decision-summary"><span>Your decision</span><strong>{action} · {allocation}% allocation</strong><small>{confidence}% confidence</small></div>
              <div className="outcome"><span>What happened next</span><strong>≈ −50%</strong><p>Netflix shares fell sharply over the following three months as cancellations rose and the Qwikster plan was abandoned.</p></div>
              <div className="benchmark"><span>Approximate 3-month comparison</span><div><p>Netflix <b>−50%</b></p><i><em style={{width: "26%"}} /></i><p>NASDAQ <b>−3%</b></p><i className="positive"><em style={{width: "63%"}} /></i></div></div>
              <div className="score-method"><span>Reasoning 45 pts</span><span>Sizing 30 pts</span><span>Calibration 25 pts</span></div>
              <div className="feedback"><strong>What you did well</strong><p>Your position size limited downside, and you explicitly recognized customer churn.</p><strong>Question to reflect on</strong><p>Did the growth evidence receive more weight than the signs of customer harm?</p></div>
              <button className="next-button" onClick={() => { setLocked(false); setReasoning(""); }}>Save reflection & continue →</button>
            </div>}
          </aside>
        </div>
      </section>

      <footer id="method"><p><strong>DecisionLab</strong> trains process, not prediction.</p><p>Historical scenarios · Transparent scoring · No investment advice</p></footer>
    </main>
    </AuthGate>
  );
}
