import type { ScorePart } from "./score";
import type { Outcome } from "./challenge";

export type BasicDecisionResponse =
  | { status: "official" | "replay" }
  | BasicPracticeResult;

export type BasicPracticeResult = {
  status: "practice";
  outcome: Outcome | null;
  score: number;
  scoring_breakdown: Record<string, ScorePart>;
};

export type Submission = {
  id: number;
  challenge_id: number;
  decision: string;
  allocation_percent: number;
  confidence_percent: number;
  submission_mode: "basic" | "advanced";
  reasoning: string;
  risks: string[];
  change_my_mind: string;
  score: number;
  scoring_breakdown: Record<string, ScorePart>;
};
