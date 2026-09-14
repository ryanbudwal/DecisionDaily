import type { ScorePart } from "./score";
import type { Outcome } from "./challenge";

export type BasicDecisionResponse =
  | { status: "official" | "replay"; is_official: boolean; submission_id: number }
  | BasicPracticeResult;

export type BasicPracticeResult = {
  status: "practice";
  is_official: false;
  outcome: Outcome | null;
  decision: string;
  allocation_percent: number;
  reasoning: string;
  risks: string[];
  change_my_mind: string;
  score: number;
  scoring_breakdown: Record<string, ScorePart>;
  rubric_version: number;
};

export type Submission = {
  id: number;
  challenge_id: number;
  user_id: string;
  decision: string;
  allocation_percent: number;
  confidence_percent: number;
  submission_mode: "basic" | "advanced";
  selected_reasoning_option_id: number | null;
  selected_risk_option_id: number | null;
  selected_change_option_id: number | null;
  reasoning: string;
  risks: string[];
  change_my_mind: string;
  score: number;
  scoring_breakdown: Record<string, ScorePart>;
  submitted_at: string;
};
