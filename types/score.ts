export type ScorePart = { score: number; max: number; feedback?: string };

export type ScoreRecord = {
  submission_id: number;
  overall_score: number;
  scoring_breakdown: Record<string, ScorePart>;
};
