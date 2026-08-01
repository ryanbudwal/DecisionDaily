import type { ScorePart } from "./score";

export type Submission = {
  id: number;
  challenge_id: number;
  user_id: string;
  decision: string;
  allocation_percent: number;
  confidence_percent: number;
  reasoning: string;
  risks: string[];
  change_my_mind: string;
  score: number;
  scoring_breakdown: Record<string, ScorePart>;
  submitted_at: string;
};
