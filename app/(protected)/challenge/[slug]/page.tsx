"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DecisionForm } from "@/components/challenges/decision-form";
import { getChallenge, getSubmission } from "@/lib/challenges/queries";
import { formatDate } from "@/lib/utils";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export default function ChallengePage() {
  const { slug } = useParams<{ slug: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void getChallenge(slug)
      .then(async (nextChallenge) => {
        setChallenge(nextChallenge);
        if (nextChallenge) setSubmission(await getSubmission(nextChallenge.id));
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="route-loading"><span>DL</span><p>Preparing the evidence…</p></div>;
  if (error) return <div className="route-error" role="alert">{error}</div>;
  if (!challenge) return <div className="route-error">This challenge could not be found.</div>;

  return <>
    <section className="daily-hero">
      <div className="daily-label"><span>Decision challenge</span><i />{formatDate(challenge.publish_date)}</div>
      <div className="hero-main"><div><h1>{challenge.title}</h1><p>{challenge.subtitle}</p></div><div className="hero-number"><span>Challenge</span><b>#{String(challenge.challenge_number).padStart(3, "0")}</b><small>{challenge.difficulty}</small></div></div>
      <div className="shared-note"><span>◎</span><p><strong>One shared scenario.</strong> Everyone sees the same evidence before making a decision.</p></div>
    </section>

    <section className="challenge-layout">
      <article className="scenario-column">
        <div className="column-heading"><span>01</span><div><small>Understand the situation</small><h2>Scenario brief</h2></div></div>
        <p className="scenario-copy">{challenge.scenario}</p>
        <h3>Information available to you</h3>
        <div className="evidence-grid">
          {challenge.evidence.map((item) => <article className={`evidence-card evidence-${item.tone}`} key={item.label}><div><span className={`signal ${item.tone}`} /><small>{item.label}</small></div><b>{item.value}</b><p>{item.detail}</p></article>)}
        </div>
        <div className="source-lock"><span>⊘</span><p>{challenge.source_note}<small>No hindsight is included before submission.</small></p></div>
      </article>
      <aside className="decision-column"><DecisionForm challenge={challenge} submission={submission} /></aside>
    </section>
  </>;
}
