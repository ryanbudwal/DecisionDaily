export type Evidence = {
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
};

export type Category =
  | "economics"
  | "investing"
  | "personal-finance"
  | "business"
  | "real-estate"
  | "crypto"
  | "markets"
  | "entrepreneurship";

export type Challenge = {
  id: number;
  slug: string;
  challenge_number: number;
  publish_date: string;
  category: Category;
  difficulty: "beginner" | "intermediate" | "advanced";
  title: string;
  subtitle: string;
  scenario: string;
  decision_prompt: string;
  evidence: Evidence[];
  decision_options: string[];
  source_note: string | null;
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
