"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-gate";
import { supabase } from "@/lib/supabase";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export function AdvancedDecisionForm({ challenge, submission }: { challenge: Challenge; submission: Submission | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const [decision, setDecision] = useState(challenge.decision_options[0] ?? "");
  const [allocation, setAllocation] = useState(10);
  const [confidence, setConfidence] = useState(60);
  const [reasoning, setReasoning] = useState("");
  const [risks, setRisks] = useState("");
  const [changeMind, setChangeMind] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const riskList = useMemo(
    () => risks.split("\n").map((risk) => risk.trim()).filter(Boolean).slice(0, 8),
    [risks],
  );
  const ready = reasoning.trim().length >= 60 && changeMind.trim().length >= 20 && riskList.length > 0;

  async function submitDecision() {
    if (!ready) return;
    setSubmitting(true);
    setError("");
    const { error: submitError } = await supabase.from("challenge_submissions").insert({
      user_id: user.id,
      challenge_id: challenge.id,
      submission_mode: "advanced",
      decision,
      allocation_percent: allocation,
      confidence_percent: confidence,
      reasoning: reasoning.trim(),
      risks: riskList,
      change_my_mind: changeMind.trim(),
    });

    if (submitError) {
      setError(submitError.code === "23505" ? "A decision is already locked for this challenge." : submitError.message);
      setSubmitting(false);
      return;
    }
    router.push(`/challenge/${challenge.slug}/results`);
  }

  const canReplay = user.app_metadata.can_replay === true;

  if (submission && !canReplay) {
    return <div className="decision-complete">
      <div className="reveal-label">Decision already locked</div>
      <h2>You chose {submission.submission_mode === "basic" ? "Basic" : "Advanced"} mode.</h2>
      <p>Only one attempt is allowed before the outcome is revealed, keeping the decision free from hindsight.</p>
      <Link className="primary-link" href={`/challenge/${challenge.slug}/results`}>View results →</Link>
    </div>;
  }

  return <>
    <div className="column-heading"><span>02</span><div><small>Advanced mode · written analysis</small><h2>Build your case</h2></div></div>
    {submission && <p className="calibration-note">CEO replay · this practice attempt will not replace your original score or affect your profile.</p>}
    <p className="decision-prompt">{challenge.decision_prompt}</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    <fieldset><legend>Choose one action</legend><div className="decision-options">
      {challenge.decision_options.map((option) => <button type="button" key={option} className={decision === option ? "selected" : ""} aria-pressed={decision === option} onClick={() => setDecision(option)}>{option}</button>)}
    </div></fieldset>
    <label className="form-label"><span>Capital at risk</span><b>{allocation}%</b></label>
    <input type="range" min="0" max="100" value={allocation} onChange={(event) => setAllocation(Number(event.target.value))} />
    <div className="range-scale"><span>0%</span><span>50%</span><span>100%</span></div>
    <label className="form-label" htmlFor="reasoning"><span>Your reasoning</span><b>{reasoning.length}/2000</b></label>
    <textarea id="reasoning" value={reasoning} onChange={(event) => setReasoning(event.target.value)} maxLength={2000} placeholder="Which evidence matters most, and how did you weigh the trade-offs?" />
    <label className="form-label" htmlFor="risks"><span>Key risks</span><b>One per line</b></label>
    <textarea id="risks" className="short-textarea" value={risks} onChange={(event) => setRisks(event.target.value)} placeholder={"Customer demand could weaken\nCosts may remain elevated\nThe plan may be difficult to execute"} />
    <label className="form-label" htmlFor="change-mind"><span>What would change your mind?</span><b>{changeMind.length}/1000</b></label>
    <textarea id="change-mind" className="short-textarea" value={changeMind} onChange={(event) => setChangeMind(event.target.value)} maxLength={1000} placeholder="Name a specific signal or new fact that would make you reconsider." />
    <label className="form-label"><span>Confidence</span><b>{confidence}%</b></label>
    <input type="range" min="1" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
    <p className="calibration-note">Confidence is not certainty. Estimate honestly.</p>
    <button className="lock-decision" disabled={!ready || submitting} onClick={submitDecision}>{submitting ? "Locking…" : "Lock advanced decision & reveal"}<span>→</span></button>
    {!ready && <p className="form-requirement">Write at least 60 characters, identify a risk, and say what would change your mind.</p>}
  </>;
}
