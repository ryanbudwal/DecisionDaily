"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ScoreBreakdown } from "@/components/scores/score-breakdown";
import { getChallenge, getCurrentReleaseDate, getOutcome, getSubmission } from "@/lib/challenges/queries";
import type { Challenge, Outcome } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export default function ResultsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [releaseDate, setReleaseDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([getChallenge(slug), getCurrentReleaseDate()])
      .then(async ([nextChallenge, nextReleaseDate]) => {
        if (!nextChallenge) return;
        setChallenge(nextChallenge);
        setReleaseDate(nextReleaseDate);
        const nextSubmission = await getSubmission(nextChallenge.id);
        if (!nextSubmission) {
          router.replace(`/challenge/${slug}`);
          return;
        }
        setSubmission(nextSubmission);
        setOutcome(await getOutcome(nextChallenge.id));
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [router, slug]);

  if (loading) return <div className="route-loading"><span>DL</span><p>Calculating your result…</p></div>;
  if (error) return <div className="route-error" role="alert">{error}</div>;
  if (!challenge || !submission) return <div className="route-loading"><p>Returning to the challenge…</p></div>;

  return <section className="results-page">
    <div className="results-heading"><span className="reveal-label">Decision locked</span><h1>{challenge.title}</h1><p>Your score evaluates the quality of your process—not whether hindsight made the choice profitable.</p></div>
    <div className="results-layout">
      <article className="results-score-card">
        <h2>Your process score</h2>
        <div className="score-circle" style={{ "--score-angle": `${submission.score * 3.6}deg` } as React.CSSProperties}><b>{submission.score}</b><span>/100</span></div>
        <div className="locked-choice"><span>Your decision</span><b>{submission.decision}</b><small>{submission.allocation_percent}% at risk · {submission.confidence_percent}% confidence</small></div>
        <div className="selected-thinking">
          <span>{submission.submission_mode === "basic" ? "Your selected cards" : "Your written analysis"}</span>
          <p><b>Reasoning:</b> {submission.reasoning}</p>
          <p><b>{submission.risks.length > 1 ? "Risks" : "Risk"}:</b> {submission.risks.join(" · ")}</p>
          <p><b>Change signal:</b> {submission.change_my_mind}</p>
        </div>
        <ScoreBreakdown breakdown={submission.scoring_breakdown} />
      </article>
      <article className="results-outcome-card">
        {outcome ? <>
          <div className="outcome-card"><span>What happened</span><h3>{outcome.outcome_title}</h3><b>{outcome.result_label}</b><p>{outcome.outcome_summary}</p>{outcome.benchmark_label && <small>{outcome.benchmark_label}: <strong>{outcome.benchmark_result}</strong></small>}</div>
          <div className="learning-list"><span>Lessons to carry forward</span>{outcome.learning_points.map((point) => <p key={point}>✓ {point}</p>)}</div>
        </> : <div className="outcome-loading">The outcome is unavailable. Your decision remains safely locked.</div>}
        <div className="results-actions"><Link href="/archive">Explore the archive →</Link><Link href="/profile">View your profile →</Link></div>
      </article>
    </div>
  </section>;
}
