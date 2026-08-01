export type Profile = {
  id: string;
  username: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  risk_tolerance: string;
  strength: string;
  weakness: string;
  decision_style: string;
  most_common_mistake: string;
  assessment_updated_at: string;
};
