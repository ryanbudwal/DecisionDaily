"use client";

import { useEffect, useState } from "react";
import { StreakDisplay } from "@/components/profile/streak-display";
import { getSubmissions } from "@/lib/challenges/queries";
import { getProfile } from "@/lib/profile/queries";
import type { Profile } from "@/types/profile";
import type { Submission } from "@/types/submission";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([getProfile(), getSubmissions()])
      .then(([nextProfile, nextSubmissions]) => {
        setProfile(nextProfile);
        setSubmissions(nextSubmissions);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="route-loading"><span>DL</span><p>Building your decision profile…</p></div>;
  if (error) return <div className="route-error" role="alert">{error}</div>;

  const averageScore = submissions.length
    ? Math.round(submissions.reduce((sum, item) => sum + item.score, 0) / submissions.length)
    : 0;
  const recentScores = submissions.slice(0, 8).reverse();
  const skillRows = [
    ["reasoning", "Reasoning"],
    ["risk_management", "Risk awareness"],
    ["falsifiability", "Open-mindedness"],
    ["position_sizing", "Position sizing"],
    ["confidence_discipline", "Confidence calibration"],
  ] as const;
  const skillValue = (key: string) => {
    const values = submissions.map((item) => item.scoring_breakdown[key]).filter(Boolean);
    return values.length ? Math.round(values.reduce((sum, item) => sum + (item.score / item.max) * 100, 0) / values.length) : 0;
  };

  return <section className="profile-page">
    <div className="profile-heading">
      <div><span className="section-kicker">Your private learning record</span><h1>Your decision profile</h1><p>Your streak, scores, and decision skills from completed challenges.</p></div>
      <div className="profile-identity"><span>{(profile?.username ?? "D").charAt(0).toUpperCase()}</span><div><small>DecisionLab member</small><b>{profile?.username ?? "Your profile"}</b></div></div>
    </div>

    <div className="profile-metrics">
      <article><span>Challenges completed</span><b>{submissions.length}</b><small>Locked decisions</small></article>
      <article><span>Average process score</span><b>{averageScore || "—"}</b><small>{averageScore ? "Out of 100" : "Complete a challenge"}</small></article>
      <StreakDisplay current={profile?.current_streak ?? 0} longest={profile?.longest_streak ?? 0} />
    </div>

    <div className="profile-analysis-grid">
      <article className="profile-chart-card"><div className="profile-section-title"><div><span>Progress</span><h2>Score trend</h2></div><small>Last {Math.max(recentScores.length, 1)} challenges</small></div><div className="score-trend" aria-label="Recent process scores">{recentScores.length ? recentScores.map((item, index) => <div key={item.id} className="trend-column"><i style={{ height: `${Math.max(item.score, 8)}%` }} /><span>{index + 1}</span></div>) : <p>Complete a challenge to begin your score trend.</p>}</div></article>
      <article className="profile-skills-card"><div className="profile-section-title"><div><span>Process</span><h2>Decision skills</h2></div></div><div className="skill-bars">{skillRows.map(([key, label]) => { const value = skillValue(key); return <div key={key}><span>{label}</span><i><em style={{ width: `${value}%` }} /></i><b>{value || "—"}</b></div>; })}</div></article>
    </div>
  </section>;
}
