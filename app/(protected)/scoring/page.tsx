const scoreParts = [
  { n: "30", title: "Reasoning depth", text: "Rewards a developed argument that connects evidence, numbers, and trade-offs." },
  { n: "25", title: "Risk management", text: "Rewards several distinct risks with enough detail to explain their possible impact." },
  { n: "20", title: "What changes your mind", text: "Rewards a specific condition, threshold, or new fact that could invalidate your view." },
  { n: "15", title: "Position sizing", text: "Checks whether the capital at risk is disciplined relative to your stated confidence." },
  { n: "10", title: "Confidence discipline", text: "Rewards honest uncertainty instead of unsupported certainty." },
];

export default function ScoringPage() {
  return <section className="method-page">
    <span className="section-kicker">Transparent by design</span><h1>We score the process,<br />not the prediction.</h1>
    <p className="method-intro">A profitable outcome can follow weak reasoning. A loss can follow an excellent decision under uncertainty. DecisionLab keeps those ideas separate.</p>
    <div className="score-cards">{scoreParts.map((item) => <article key={item.title}><b>{item.n}</b><div><h2>{item.title}</h2><p>{item.text}</p></div></article>)}</div>
    <div className="method-note"><strong>Your decision locks before the outcome appears.</strong><p>Supabase calculates rubric version 2 from the locked submission. The historical outcome never changes the process score, and each result includes component-by-component feedback.</p></div>
  </section>;
}
