"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-gate";
import { getChallenges, getSubmissions } from "@/lib/challenges/queries";
import { formatDate } from "@/lib/utils";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export default function DashboardPage() {
  const { isGuest } = useAuth();
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

  if (loading) return <div className="route-loading"><span>DD</span><p>Loading today&apos;s challenge…</p></div>;
  if (error) return <div className="route-error" role="alert">{error}</div>;
  if (!challenge) return <div className="route-error">No challenge has been published yet.</div>;

  const completed = submissions.find((item) => item.challenge_id === challenge.id);
  const averageScore = submissions.length
    ? Math.round(submissions.reduce((sum, item) => sum + item.score, 0) / submissions.length)
    : 0;

  return <section className="dashboard-page">
    {isGuest && <aside className="guest-session-note"><span>Guest mode</span><p>Your decisions are private and saved in this browser, but they will not follow you to another device.</p></aside>}
    <div className="dashboard-intro">
      <time className="dashboard-date">{formatDate(challenge.publish_date)}</time>
      <h1>One scenario. Make your call.</h1>
      <p>Everyone gets the same evidence. Choose how deeply you want to think today.</p>
    </div>

    <article className="daily-card-featured">
      <div className="daily-card-meta">
        <span className="daily-sequence">Basic · quick play</span>
        <span className="mode-time">About 2 minutes</span>
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
      <div><span className="daily-sequence">Advanced · deep analysis</span><h2>Write out your full investment case</h2><p>Use detailed reasoning, key risks, and the evidence that would change your mind.</p></div>
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
