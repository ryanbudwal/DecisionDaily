"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-gate";
import { getChallenges, getCurrentReleaseDate, getSubmissions } from "@/lib/challenges/queries";
import { formatDate } from "@/lib/utils";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export default function DashboardPage() {
  const { isGuest } = useAuth();
  const [basicChallenge, setBasicChallenge] = useState<Challenge | null>(null);
  const [advancedChallenge, setAdvancedChallenge] = useState<Challenge | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([getChallenges(), getSubmissions(), getCurrentReleaseDate()])
      .then(([challenges, nextSubmissions, releaseDate]) => {
        setBasicChallenge(challenges.find((item) => item.publish_date === releaseDate && (item.challenge_mode === "basic" || item.challenge_mode === "both")) ?? null);
        setAdvancedChallenge(challenges.find((item) => item.challenge_mode === "advanced" && item.publish_date === releaseDate)
          ?? challenges.find((item) => item.challenge_mode === "both" && item.publish_date === releaseDate)
          ?? null);
        setSubmissions(nextSubmissions);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="route-loading"><span>DL</span><p>Loading today&apos;s challenge…</p></div>;
  if (error) return <div className="route-error" role="alert">{error}</div>;
  if (!basicChallenge && !advancedChallenge) return <section className="dashboard-page"><div className="dashboard-intro"><span className="section-kicker">No current release</span><h1>The archive is open.</h1><p>There is no Eastern-dated Basic Daily or active Advanced Weekly challenge right now. Practise a past scenario while you wait for the next release.</p></div><Link className="primary-link" href="/archive">Explore the archive →</Link></section>;

  const basicCompleted = basicChallenge ? submissions.find((item) => item.challenge_id === basicChallenge.id) : undefined;
  const advancedCompleted = advancedChallenge ? submissions.find((item) => item.challenge_id === advancedChallenge.id) : undefined;
  const averageScore = submissions.length
    ? Math.round(submissions.reduce((sum, item) => sum + item.score, 0) / submissions.length)
    : 0;

  return <section className="dashboard-page">
    {isGuest && <aside className="guest-session-note"><span>Guest mode</span><p>Your decisions are private and saved in this browser, but they will not follow you to another device.</p></aside>}
    <div className="dashboard-intro">
      <time className="dashboard-date">{formatDate((basicChallenge ?? advancedChallenge)!.publish_date)}</time>
      <h1>Your next decision starts here.</h1>
      <p>Take today&apos;s quick Basic challenge or build a deeper case in this week&apos;s Advanced challenge.</p>
    </div>

    {basicChallenge ? <article className="daily-card-featured">
      <div className="daily-card-meta">
        <span className="daily-sequence">Basic · quick play</span>
        <span className="mode-time">About 2 minutes</span>
      </div>
      <div className="daily-card-body">
        <div>
          <small>Challenge #{String(basicChallenge.challenge_number).padStart(3, "0")}</small>
          <h2>{basicChallenge.title}</h2>
          <p>{basicChallenge.subtitle}</p>
        </div>
        {basicCompleted && <div className="daily-card-status">
          <span>Completed</span>
          <b>{basicCompleted.score}</b>
          <small>Process score</small>
        </div>}
      </div>
      <Link className="primary-link" href={basicCompleted ? `/challenge/${basicChallenge.slug}/results` : `/challenge/${basicChallenge.slug}`}>
        {basicCompleted ? "Review today’s result" : "Start today’s challenge"} →
      </Link>
    </article> : <article className="daily-card-featured release-empty-card"><span className="daily-sequence">Basic Daily</span><h2>No Basic release today</h2><p>The archive remains open for practice.</p><Link className="primary-link" href="/archive">Practise Basic →</Link></article>}

    {advancedChallenge ? <article className="advanced-mode-card">
      <div><span className="daily-sequence">Advanced Weekly · deep analysis</span><h2>{advancedChallenge.title}</h2><p>{advancedChallenge.subtitle}</p></div>
      <Link className="advanced-mode-link" href={advancedCompleted ? `/challenge/${advancedChallenge.slug}/results` : `/challenge/${advancedChallenge.slug}/advanced`}>
        {advancedCompleted ? "Review advanced result" : "Start this week’s challenge"} →
      </Link>
    </article> : <article className="advanced-mode-card release-empty-card"><div><span className="daily-sequence">Advanced Weekly</span><h2>No active weekly release</h2><p>Return when the next deep-analysis challenge is published.</p></div><Link className="advanced-mode-link" href="/archive">Explore advanced archive →</Link></article>}

    <div className="dashboard-stats">
      <article><span>Completed</span><b>{submissions.length}</b><small>Locked decisions</small></article>
      <article><span>Average score</span><b>{averageScore || "—"}</b><small>Decision process</small></article>
      <article><span>Practice library</span><b>∞</b><small>Challenges stay available</small></article>
    </div>
  </section>;
}
