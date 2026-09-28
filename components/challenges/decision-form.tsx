"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoreBreakdown } from "@/components/scores/score-breakdown";
import { submitBasicDecision } from "@/lib/challenges/queries";
import type { BasicChoice, Challenge } from "@/types/challenge";
import type { BasicPracticeResult, Submission } from "@/types/submission";

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

export function DecisionForm({
  challenge,
  submission,
}: {
  challenge: Challenge;
  submission: Submission | null;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState(challenge.decision_options[0] ?? "");
  const [allocation, setAllocation] = useState(10);
  const [reasoningChoice, setReasoningChoice] = useState<number | null>(null);
  const [riskChoice, setRiskChoice] = useState<number | null>(null);
  const [changeChoice, setChangeChoice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [practiceResult, setPracticeResult] = useState<BasicPracticeResult | null>(null);

  const choices = challenge.basic_choices;
  const ready = Boolean(decision && reasoningChoice && riskChoice && changeChoice);

  async function submitDecision() {
    if (!ready) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await submitBasicDecision({
        challengeId: challenge.id,
        decision,
        allocationPercent: allocation,
        reasoningOptionId: reasoningChoice!,
        riskOptionId: riskChoice!,
        changeOptionId: changeChoice!,
      });
      if (result.status === "practice") {
        setPracticeResult(result);
      } else {
        router.push(`/challenge/${challenge.slug}/results`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit your decision.");
    } finally {
      setSubmitting(false);
    }
  }

  if (practiceResult) {
    return <div className="decision-complete">
      <div className="reveal-label">Practice result</div>
      <h2>Your process score: {practiceResult.score}/100</h2>
      <p>{practiceResult.outcome?.outcome_summary ?? "The outcome is unavailable."}</p>
      <ScoreBreakdown breakdown={practiceResult.scoring_breakdown} />
      <button className="lock-decision" onClick={() => setPracticeResult(null)}>Try again</button>
    </div>;
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
    <p className="calibration-note">Choose the cards that best reflect your reasoning.</p>
    <button className="lock-decision" disabled={!ready || submitting} onClick={submitDecision}>{submitting ? "Locking…" : "Lock decision & reveal"}<span>→</span></button>
    {!ready && <p className="form-requirement">Choose one card from each group to reveal the result.</p>}
  </>;
}
