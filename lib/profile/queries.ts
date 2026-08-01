import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/profile";

export async function getProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, current_streak, longest_streak, last_completed_date, risk_tolerance, strength, weakness, decision_style, most_common_mistake, assessment_updated_at")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile | null) ?? null;
}
