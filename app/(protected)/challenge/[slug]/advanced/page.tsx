"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdvancedDecisionForm } from "@/components/challenges/advanced-decision-form";
import { ScenarioBrief } from "@/components/challenges/scenario-brief";
import { getChallenge, getSubmission } from "@/lib/challenges/queries";
import { formatDate } from "@/lib/utils";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export default function AdvancedChallengePage() {
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

  if (loading) return <div className="route-loading"><span>DD</span><p>Preparing advanced mode…</p></div>;
  if (error) return <div className="route-error" role="alert">{error}</div>;
  if (!challenge) return <div className="route-error">This challenge could not be found.</div>;
  if (challenge.challenge_mode === "basic") return <div className="route-error">This challenge is available only in Basic mode.</div>;

  return <>
    <section className="daily-hero advanced-hero">
      <div className="daily-label"><span>Advanced challenge</span><i />{formatDate(challenge.publish_date)}</div>
      <div className="hero-main"><h1>{challenge.title}</h1><p>{challenge.subtitle}</p></div>
      <div className="shared-note"><span>✎</span><p><strong>Build the full case.</strong> Explain your reasoning, risks, and what evidence would change your mind.</p></div>
    </section>

    <section className="challenge-layout">
      <ScenarioBrief challenge={challenge} />
      <aside className="decision-column"><AdvancedDecisionForm challenge={challenge} submission={submission} /></aside>
    </section>
  </>;
}
