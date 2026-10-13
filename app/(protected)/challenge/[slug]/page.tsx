"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DecisionForm } from "@/components/challenges/decision-form";
import { ScenarioBrief } from "@/components/challenges/scenario-brief";
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
  if (challenge.challenge_mode === "advanced") return <div className="route-error">This is an Advanced Weekly challenge. Open it from the Advanced section.</div>;

  return <>
    <section className="daily-hero">
      <div className="daily-label"><span>Decision challenge</span><i />{formatDate(challenge.publish_date)}</div>
      <div className="hero-main"><h1>{challenge.title}</h1><p>{challenge.subtitle}</p></div>
      <div className="shared-note"><span>◎</span><p><strong>One shared scenario.</strong> Everyone sees the same evidence before making a decision.</p></div>
    </section>

    <section className="challenge-layout">
      <ScenarioBrief challenge={challenge} />
      <aside className="decision-column"><DecisionForm challenge={challenge} submission={submission} /></aside>
    </section>
  </>;
}
