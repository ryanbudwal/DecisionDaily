const scoreParts = [
  { n: "30", title: "Reasoning depth", text: "Did you form a clear, evidence-based case?" },
  { n: "25", title: "Risk management", text: "Did you identify multiple ways the decision could fail?" },
  { n: "20", title: "Falsifiability", text: "Did you say what evidence would change your mind?" },
  { n: "15", title: "Position sizing", text: "Did the capital at risk match the uncertainty?" },
  { n: "10", title: "Calibration", text: "Was your confidence appropriately measured?" },
];

export default function ScoringPage() {
  return <section className="method-page">
    <span className="section-kicker">Transparent by design</span><h1>We score the process,<br />not the prediction.</h1>
    <p className="method-intro">A profitable outcome can follow weak reasoning. A loss can follow an excellent decision under uncertainty. DecisionLab keeps those ideas separate.</p>
    <div className="score-cards">{scoreParts.map((item) => <article key={item.title}><b>{item.n}</b><div><h2>{item.title}</h2><p>{item.text}</p></div></article>)}</div>
    <div className="method-note"><strong>Your decision locks before the outcome appears.</strong><p>The database calculates the score and keeps every submission private to its owner.</p></div>
  </section>;
}
