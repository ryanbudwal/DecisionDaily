import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/profile";

export async function getProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, current_streak, longest_streak")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile | null) ?? null;
}
