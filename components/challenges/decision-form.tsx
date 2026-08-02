"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-gate";
import { supabase } from "@/lib/supabase";
import type { BasicChoice, Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

function ChoiceGroup({
  title,
  hint,
  options,
  selected,
  onSelect,
}: {
  title: string;
  hint: string;
  options: BasicChoice[];
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  return <fieldset className="choice-group">
    <legend>{title}</legend>
    <p>{hint}</p>
    <div className="choice-grid">
      {options.map((option) => <button
        type="button"
        key={option.id}
        className={selected === option.id ? "selected" : ""}
        aria-pressed={selected === option.id}
        onClick={() => onSelect(option.id)}
      >{option.option_text}</button>)}
    </div>
  </fieldset>;
}

export function DecisionForm({ challenge, submission }: { challenge: Challenge; submission: Submission | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const [decision, setDecision] = useState(challenge.decision_options[0] ?? "");
  const [allocation, setAllocation] = useState(10);
  const [confidence, setConfidence] = useState(60);
  const [reasoningChoice, setReasoningChoice] = useState<number | null>(null);
  const [riskChoice, setRiskChoice] = useState<number | null>(null);
  const [changeChoice, setChangeChoice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const choices = challenge.basic_choices;
  const ready = Boolean(decision && reasoningChoice && riskChoice && changeChoice);

  async function submitDecision() {
    if (!ready) return;
    setSubmitting(true);
    setError("");
    const { error: submitError } = await supabase.from("challenge_submissions").insert({
      user_id: user.id,
      challenge_id: challenge.id,
      submission_mode: "basic",
      decision,
      allocation_percent: allocation,
      confidence_percent: confidence,
      selected_reasoning_option_id: reasoningChoice,
      selected_risk_option_id: riskChoice,
      selected_change_option_id: changeChoice,
    });

    if (submitError) {
      setError(submitError.code === "23505" ? "This decision is already locked." : submitError.message);
      setSubmitting(false);
      return;
    }
    router.push(`/challenge/${challenge.slug}/results`);
  }

  if (submission) {
    return <div className="decision-complete">
      <div className="reveal-label">Decision locked</div>
      <h2>Your answer is safely recorded.</h2>
      <p>Review your score, the historical outcome, and what each choice revealed about your process.</p>
      <Link className="primary-link" href={`/challenge/${challenge.slug}/results`}>View results →</Link>
    </div>;
  }

  if (!choices || choices.reasoning.length === 0) {
    return <div className="route-error">Basic choices are not available for this challenge yet.</div>;
  }

  return <>
    <div className="column-heading"><span>02</span><div><small>Basic mode · about 2 minutes</small><h2>Make your call</h2></div></div>
    <p className="decision-prompt">{challenge.decision_prompt}</p>
    {error && <div className="form-error" role="alert">{error}</div>}

    <fieldset><legend>Choose one action</legend><div className="decision-options">
      {challenge.decision_options.map((option) => <button type="button" key={option} className={decision === option ? "selected" : ""} aria-pressed={decision === option} onClick={() => setDecision(option)}>{option}</button>)}
    </div></fieldset>

    <ChoiceGroup title="What matters most?" hint="Choose the reasoning best supported by the scenario." options={choices.reasoning} selected={reasoningChoice} onSelect={setReasoningChoice} />
    <ChoiceGroup title="What is the biggest risk?" hint="Choose the downside that deserves the most attention." options={choices.risk} selected={riskChoice} onSelect={setRiskChoice} />
    <ChoiceGroup title="What would change the decision?" hint="Choose the new information that would be most useful." options={choices.change_mind} selected={changeChoice} onSelect={setChangeChoice} />

    <label className="form-label"><span>Capital at risk</span><b>{allocation}%</b></label>
    <input type="range" min="0" max="100" value={allocation} onChange={(event) => setAllocation(Number(event.target.value))} />
    <div className="range-scale"><span>0%</span><span>50%</span><span>100%</span></div>
    <label className="form-label"><span>Confidence</span><b>{confidence}%</b></label>
    <input type="range" min="1" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
    <p className="calibration-note">Confidence is not certainty. Estimate honestly.</p>
    <button className="lock-decision" disabled={!ready || submitting} onClick={submitDecision}>{submitting ? "Locking…" : "Lock decision & reveal"}<span>→</span></button>
    {!ready && <p className="form-requirement">Choose one card from each group to reveal the result.</p>}
  </>;
}
