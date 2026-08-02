"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getChallenges, getSubmissions } from "@/lib/challenges/queries";
import { formatDate } from "@/lib/utils";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export default function DashboardPage() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([getChallenges(), getSubmissions()])
      .then(([challenges, nextSubmissions]) => {
        setChallenge(challenges[0] ?? null);
        setSubmissions(nextSubmissions);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="route-loading"><span>DL</span><p>Loading today&apos;s challenge…</p></div>;
  if (error) return <div className="route-error" role="alert">{error}</div>;
  if (!challenge) return <div className="route-error">No challenge has been published yet.</div>;

  const completed = submissions.find((item) => item.challenge_id === challenge.id);
  const averageScore = submissions.length
    ? Math.round(submissions.reduce((sum, item) => sum + item.score, 0) / submissions.length)
    : 0;

  return <section className="dashboard-page">
    <div className="dashboard-intro">
      <span className="section-kicker">Today&apos;s shared investment game</span>
      <h1>One scenario.<br />Make your call.</h1>
      <p>Read the evidence, choose the cards that matter most, lock your decision, and reveal what happened.</p>
    </div>

    <article className="daily-card-featured">
      <div className="daily-card-meta">
        <span className="daily-sequence">Basic · quick play</span>
        <time>{formatDate(challenge.publish_date)}</time>
      </div>
      <div className="daily-card-body">
        <div>
          <small>Challenge #{String(challenge.challenge_number).padStart(3, "0")}</small>
          <h2>{challenge.title}</h2>
          <p>{challenge.subtitle}</p>
        </div>
        {completed && <div className="daily-card-status">
          <span>{completed ? "Completed" : "Ready"}</span>
          <b>{completed.score}</b>
          <small>Process score</small>
        </div>}
      </div>
      <Link className="primary-link" href={completed ? `/challenge/${challenge.slug}/results` : `/challenge/${challenge.slug}`}>
        {completed ? "Review today’s result" : "Start today’s challenge"} →
      </Link>
    </article>

    <article className="advanced-mode-card">
      <div><span className="daily-sequence">Advanced · deep analysis</span><h2>Write out your full investment case</h2><p>Use the original format for detailed reasoning, key risks, and what would change your mind.</p></div>
      <Link className="advanced-mode-link" href={completed ? `/challenge/${challenge.slug}/results` : `/challenge/${challenge.slug}/advanced`}>
        {completed ? `Review ${completed.submission_mode} result` : "Start advanced mode"} →
      </Link>
    </article>

    <div className="dashboard-stats">
      <article><span>Completed</span><b>{submissions.length}</b><small>Locked decisions</small></article>
      <article><span>Average score</span><b>{averageScore || "—"}</b><small>Decision process</small></article>
      <article><span>Practice library</span><b>∞</b><small>Challenges stay available</small></article>
    </div>
  </section>;
}
