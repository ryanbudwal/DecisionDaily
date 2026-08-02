const scoreParts = [
  { n: "30", title: "Reasoning choice", text: "How well did your selected reasoning use the evidence and weigh the trade-offs?" },
  { n: "25", title: "Risk recognition", text: "Did you identify the downside that deserves the most attention?" },
  { n: "20", title: "Decision signal", text: "Did you choose information that could genuinely change the decision?" },
  { n: "15", title: "Position sizing", text: "Checks whether the capital at risk is disciplined relative to your stated confidence." },
  { n: "10", title: "Confidence discipline", text: "Rewards honest uncertainty instead of unsupported certainty." },
];

export default function ScoringPage() {
  return <section className="method-page">
    <span className="section-kicker">Transparent by design</span><h1>We score the process,<br />not the prediction.</h1>
    <p className="method-intro">Basic mode scores the cards you select, your position size, and your confidence. The historical outcome never changes your process score.</p>
    <div className="score-cards">{scoreParts.map((item) => <article key={item.title}><b>{item.n}</b><div><h2>{item.title}</h2><p>{item.text}</p></div></article>)}</div>
    <div className="method-note"><strong>The choices are visible. Their values are not.</strong><p>The database keeps card weights hidden until your decision locks, then returns clear feedback for every selection.</p></div>
  </section>;
}
