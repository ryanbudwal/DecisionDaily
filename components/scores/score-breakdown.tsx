import type { ScorePart } from "@/types/score";

export function ScoreBreakdown({ breakdown }: { breakdown: Record<string, ScorePart> }) {
  return <div className="breakdown-list">
    {Object.entries(breakdown).map(([key, value]) => <div key={key}>
      <span>{key.replaceAll("_", " ")}</span>
      <i><em style={{ width: `${(value.score / value.max) * 100}%` }} /></i>
      <b>{value.score}/{value.max}</b>
    </div>)}
  </div>;
}
