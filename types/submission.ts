import type { ScorePart } from "./score";
import type { Outcome } from "./challenge";

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
  attempt_number: number;
  is_replay: boolean;
  is_official: boolean;
};

export type BasicPracticeResult = {
  status: "practice";
  is_official: false;
  decision: string;
  allocation_percent: number;
  reasoning: string;
  risks: string[];
  change_my_mind: string;
  score: number;
  scoring_breakdown: Record<string, ScorePart>;
  rubric_version: 4;
  outcome: Outcome | null;
};

export type BasicDecisionResponse = BasicPracticeResult | {
  status: "official" | "replay";
  is_official: boolean;
  submission_id: number;
};
