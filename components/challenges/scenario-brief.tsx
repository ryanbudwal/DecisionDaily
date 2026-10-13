import type { Challenge } from "@/types/challenge";

export function ScenarioBrief({ challenge }: { challenge: Challenge }) {
  return (
    <article className="scenario-column">
      <div className="column-heading">
        <span>01</span>
        <div><small>Understand the situation</small><h2>Scenario brief</h2></div>
      </div>
      <p className="scenario-copy">{challenge.scenario}</p>
      <h3>Information available to you</h3>
      <div className="evidence-grid">
        {challenge.evidence.map((item) => (
          <article className={`evidence-card evidence-${item.tone}`} key={item.label}>
            <div><span className={`signal ${item.tone}`} /><small>{item.label}</small></div>
            <b>{item.value}</b>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
      <div className="source-lock">
        <span>⊘</span>
        <p>{challenge.source_note}<small>No hindsight is included before submission.</small></p>
      </div>
    </article>
  );
}
