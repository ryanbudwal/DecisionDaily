export type Evidence = {
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
};

export type BasicChoice = {
  id: number;
  challenge_id: number;
  prompt_type: "reasoning" | "risk" | "change_mind";
  option_key: string;
  option_text: string;
  display_order: number;
};

export type BasicChoiceGroups = {
  reasoning: BasicChoice[];
  risk: BasicChoice[];
  change_mind: BasicChoice[];
};

export type Challenge = {
  id: number;
  slug: string;
  challenge_number: number;
  publish_date: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  title: string;
  subtitle: string;
  scenario: string;
  decision_prompt: string;
  evidence: Evidence[];
  decision_options: string[];
  source_note: string | null;
  basic_choices?: BasicChoiceGroups;
};

export type Outcome = {
  challenge_id: number;
  outcome_title: string;
  outcome_summary: string;
  result_label: string;
  benchmark_label: string | null;
  benchmark_result: string | null;
  learning_points: string[];
};
