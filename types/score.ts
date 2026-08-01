export type ScorePart = { score: number; max: number };

export type ScoreRecord = {
  submission_id: number;
  overall_score: number;
  scoring_breakdown: Record<string, ScorePart>;
};
