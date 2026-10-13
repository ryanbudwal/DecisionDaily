import { supabase } from "@/lib/supabase";
import type { BasicChoice, BasicChoiceGroups, Challenge, Outcome } from "@/types/challenge";
import type { ScoreRecord } from "@/types/score";
import type { BasicDecisionResponse, Submission } from "@/types/submission";
import type { ChallengeDraft } from "@/types/challenge-studio";

const submissionFields = "id, challenge_id, decision, allocation_percent, confidence_percent, submission_mode, reasoning, risks, change_my_mind, score, scoring_breakdown";

export async function getChallenges() {
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("*")
    .order("publish_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Challenge[];
}

export async function getCurrentReleaseDate() {
  const { data, error } = await supabase.rpc("current_release_date");
  if (error) throw new Error(error.message);
  return data as string;
}

export async function getChallenge(slug: string) {
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const challenge = data as Challenge;
  const { data: choiceData, error: choiceError } = await supabase
    .from("basic_choice_options")
    .select("id, prompt_type, option_text")
    .eq("challenge_id", challenge.id)
    .order("display_order", { ascending: true });
  if (choiceError) throw new Error(choiceError.message);

  const basicChoices: BasicChoiceGroups = { reasoning: [], risk: [], change_mind: [] };
  for (const choice of (choiceData ?? []) as BasicChoice[]) {
    basicChoices[choice.prompt_type].push(choice);
  }

  return { ...challenge, basic_choices: basicChoices };
}

export async function getSubmissions() {
  const submissionResult = await supabase
    .from("challenge_submissions")
    .select(submissionFields)
    .order("submitted_at", { ascending: false });

  if (submissionResult.error) throw new Error(submissionResult.error.message);
  const submissions = (submissionResult.data ?? []) as Submission[];
  if (submissions.length === 0) return [];

  const scoreResult = await supabase
    .from("scores")
    .select("submission_id, overall_score, scoring_breakdown")
    .in("submission_id", submissions.map((submission) => submission.id));
  if (scoreResult.error) throw new Error(scoreResult.error.message);

  const scoreBySubmission = new Map(
    ((scoreResult.data ?? []) as ScoreRecord[]).map((score) => [score.submission_id, score]),
  );

  return submissions.map((submission) => {
    const score = scoreBySubmission.get(submission.id);
    return score
      ? { ...submission, score: score.overall_score, scoring_breakdown: score.scoring_breakdown }
      : submission;
  });
}

export async function submitBasicDecision(input: {
  challengeId: number;
  decision: string;
  allocationPercent: number;
  reasoningOptionId: number;
  riskOptionId: number;
  changeOptionId: number;
}) {
  const { data, error } = await supabase.rpc("submit_basic_decision", {
    challenge_id: input.challengeId,
    decision: input.decision,
    allocation_percent: input.allocationPercent,
    reasoning_option_id: input.reasoningOptionId,
    risk_option_id: input.riskOptionId,
    change_option_id: input.changeOptionId,
  });
  if (error) throw new Error(error.message);
  return data as BasicDecisionResponse;
}

export async function getChallengeStudio() {
  const { data, error } = await supabase.rpc("list_challenge_studio");
  if (error) throw new Error(error.message);
  return (data ?? []) as ChallengeDraft[];
}

export async function saveChallengeDraft(draft: ChallengeDraft) {
  const { data, error } = await supabase.rpc("save_challenge_draft", { payload: draft });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function publishChallenge(challengeId: number) {
  const { data, error } = await supabase.rpc("publish_challenge", { challenge_id: challengeId });
  if (error) throw new Error(error.message);
  return data as { status: "published"; publish_date: string };
}

export async function getSubmission(challengeId: number) {
  const { data, error } = await supabase
    .from("challenge_submissions")
    .select(submissionFields)
    .eq("challenge_id", challengeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const submission = data as Submission;
  const { data: scoreData, error: scoreError } = await supabase
    .from("scores")
    .select("submission_id, overall_score, scoring_breakdown")
    .eq("submission_id", submission.id)
    .maybeSingle();
  if (scoreError) throw new Error(scoreError.message);

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
  if (error) throw new Error(error.message);
  return (data as Outcome | null) ?? null;
}
