import type { ScorePart } from "@/types/score";

const scoreParts = [
  ["reasoning", "Reasoning depth"],
  ["risk_management", "Risk management"],
  ["falsifiability", "What changes your mind"],
  ["position_sizing", "Position sizing"],
  ["confidence_discipline", "Confidence discipline"],
] as const;

export function ScoreBreakdown({ breakdown }: { breakdown: Record<string, ScorePart> }) {
  return <div className="breakdown-list">
    {scoreParts.map(([key, label]) => {
      const value = breakdown[key];
      if (!value) return null;
      return <div key={key}>
        <span>{label}</span>
        <i><em style={{ width: `${(value.score / value.max) * 100}%` }} /></i>
        <b>{value.score}/{value.max}</b>
        {value.feedback && <p>{value.feedback}</p>}
      </div>;
    })}
  </div>;
}
