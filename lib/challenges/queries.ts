import { supabase } from "@/lib/supabase";
import type { BasicChoice, BasicChoiceGroups, Challenge, Outcome } from "@/types/challenge";
import type { ScoreRecord } from "@/types/score";
import type { Submission } from "@/types/submission";

function fail(message: string): never {
  throw new Error(message);
}

export async function getChallenges() {
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("*")
    .order("publish_date", { ascending: false });
  if (error) fail(error.message);
  return (data ?? []) as Challenge[];
}

export async function getChallenge(slug: string) {
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail(error.message);
  if (!data) return null;

  const challenge = data as Challenge;
  const { data: choiceData, error: choiceError } = await supabase
    .from("basic_choice_options")
    .select("id, challenge_id, prompt_type, option_key, option_text, display_order")
    .eq("challenge_id", challenge.id)
    .order("display_order", { ascending: true });
  if (choiceError) fail(choiceError.message);

  const basicChoices: BasicChoiceGroups = { reasoning: [], risk: [], change_mind: [] };
  for (const choice of (choiceData ?? []) as BasicChoice[]) {
    basicChoices[choice.prompt_type].push(choice);
  }

  return { ...challenge, basic_choices: basicChoices };
}

export async function getSubmissions() {
  const [submissionResult, scoreResult] = await Promise.all([
    supabase.from("challenge_submissions").select("*").eq("is_replay", false).order("submitted_at", { ascending: false }),
    supabase.from("scores").select("submission_id, overall_score, scoring_breakdown"),
  ]);

  if (submissionResult.error) fail(submissionResult.error.message);
  if (scoreResult.error) fail(scoreResult.error.message);

  const scoreBySubmission = new Map(
    ((scoreResult.data ?? []) as ScoreRecord[]).map((score) => [score.submission_id, score]),
  );

  return ((submissionResult.data ?? []) as Submission[]).map((submission) => {
    const score = scoreBySubmission.get(submission.id);
    return score
      ? { ...submission, score: score.overall_score, scoring_breakdown: score.scoring_breakdown }
      : submission;
  });
}

export async function getSubmission(challengeId: number) {
  const { data, error } = await supabase
    .from("challenge_submissions")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail(error.message);
  if (!data) return null;

  const submission = data as Submission;
  const { data: scoreData, error: scoreError } = await supabase
    .from("scores")
    .select("submission_id, overall_score, scoring_breakdown")
    .eq("submission_id", submission.id)
    .maybeSingle();
  if (scoreError) fail(scoreError.message);

  const score = scoreData as ScoreRecord | null;
  return score
    ? { ...submission, score: score.overall_score, scoring_breakdown: score.scoring_breakdown }
    : submission;
}

export async function getOutcome(challengeId: number) {
  const { data, error } = await supabase
    .from("challenge_outcomes")
    .select("*")
    .eq("challenge_id", challengeId)
    .maybeSingle();
  if (error) fail(error.message);
  return (data as Outcome | null) ?? null;
}
