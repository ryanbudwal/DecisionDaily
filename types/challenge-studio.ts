import type { Evidence } from "./challenge";

export type StudioChoice = {
  prompt_type: "reasoning" | "risk" | "change_mind";
  option_text: string;
  points: number;
  feedback: string;
};

export type StudioOutcome = {
  outcome_title: string;
  outcome_summary: string;
  result_label: string;
  benchmark_label: string;
  benchmark_result: string;
  learning_points: string[];
};

export type ChallengeDraft = {
  id?: number;
  challenge_mode: "basic" | "advanced" | "both";
  slug: string;
  challenge_number?: number;
  publish_date: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  title: string;
  subtitle: string;
  scenario: string;
  decision_prompt: string;
  evidence: Evidence[];
  decision_options: string[];
  source_note: string;
  is_published?: boolean;
  basic_choices: StudioChoice[];
  outcome: StudioOutcome;
};
