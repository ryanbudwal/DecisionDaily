const scoreParts = [
  { n: "30", title: "Reasoning choice", text: "How well did your selected reasoning use the evidence and weigh the trade-offs?" },
  { n: "25", title: "Risk recognition", text: "Did you identify the downside that deserves the most attention?" },
  { n: "20", title: "Decision signal", text: "Did you choose information that could genuinely change the decision?" },
  { n: "25", title: "Position sizing", text: "Does the capital at risk leave room for uncertainty?" },
];

export default function ScoringPage() {
  return <section className="method-page">
    <span className="section-kicker">Transparent by design</span><h1>We score the process,<br />not the prediction.</h1>
    <p className="method-intro">Basic mode scores the cards you select and your position size. Advanced mode also scores your written analysis and confidence. The historical outcome never changes your process score.</p>
    <div className="score-cards">{scoreParts.map((item, index) => <article key={item.title}><span className="score-index">0{index + 1}</span><div><div className="score-card-title"><h2>{item.title}</h2><b>up to {item.n} pts</b></div><p>{item.text}</p></div></article>)}</div>
    <div className="method-note"><strong>Why this approach?</strong><p>A good decision can have a bad outcome, and a weak decision can get lucky. Decision Daily separates the quality of your process from what the market happened to do.</p><small>The choices are visible. Their hidden values are revealed only after your decision locks.</small></div>
  </section>;
}
