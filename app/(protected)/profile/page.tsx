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

  if (loading) return <div className="route-loading"><span>DD</span><p>Building your decision profile…</p></div>;
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
  ] as const;
  const skillValue = (key: string) => {
    const values = submissions.map((item) => item.scoring_breakdown[key]).filter(Boolean);
    return values.length ? Math.round(values.reduce((sum, item) => sum + (item.score / item.max) * 100, 0) / values.length) : 0;
  };
  const weakness = profile?.weakness && !profile.weakness.toLowerCase().includes("confidence")
    ? profile.weakness
    : "Underweighting downside scenarios";

  return <section className="profile-page">
    <div className="profile-heading">
      <div><span className="section-kicker">Your private learning record</span><h1>Your decision profile</h1><p>A living snapshot of how you approach uncertainty. It will become more personal as Decision Daily learns from your locked decisions.</p></div>
      <div className="profile-identity"><span>{(profile?.username ?? "D").charAt(0).toUpperCase()}</span><div><small>Decision Daily member</small><b>{profile?.username ?? "Your profile"}</b></div></div>
    </div>

    <div className="profile-metrics">
      <article><span>Challenges completed</span><b>{submissions.length}</b><small>Locked decisions</small></article>
      <article><span>Average process score</span><b>{averageScore || "—"}</b><small>{averageScore ? "Out of 100" : "Complete a challenge"}</small></article>
      <StreakDisplay current={profile?.current_streak ?? 0} longest={profile?.longest_streak ?? 0} />
    </div>

    <div className="profile-baseline"><span>V1 baseline</span><p>These starter insights are private to your account. Future versions will update them from patterns in your decisions, position sizing, risk analysis, and reflections.</p></div>
    <div className="profile-analysis-grid">
      <article className="profile-chart-card"><div className="profile-section-title"><div><span>Progress</span><h2>Score trend</h2></div><small>Last {Math.max(recentScores.length, 1)} challenges</small></div><div className="score-trend" aria-label="Recent process scores">{recentScores.length ? recentScores.map((item, index) => <div key={item.id} className="trend-column"><i style={{ height: `${Math.max(item.score, 8)}%` }} /><span>{index + 1}</span></div>) : <p>Complete a challenge to begin your score trend.</p>}</div></article>
      <article className="profile-skills-card"><div className="profile-section-title"><div><span>Process</span><h2>Decision skills</h2></div></div><div className="skill-bars">{skillRows.map(([key, label]) => { const value = skillValue(key); return <div key={key}><span>{label}</span><i><em style={{ width: `${value}%` }} /></i><b>{value || "—"}</b></div>; })}</div></article>
    </div>
    <div className="profile-insights">
      <article className="profile-insight profile-insight-primary"><div className="insight-icon">R</div><small>Risk tolerance</small><h2>{profile?.risk_tolerance ?? "Medium"}</h2><p>You are comfortable taking measured risk when the evidence supports it, without treating uncertainty as certainty.</p></article>
      <article className="profile-insight profile-insight-strength"><div className="insight-icon">+</div><small>Strength</small><h2>{profile?.strength ?? "Long-term thinking"}</h2><p>You tend to look beyond the immediate reaction and consider how a decision compounds over time.</p></article>
      <article className="profile-insight"><div className="insight-icon">D</div><small>Decision style</small><h2>{profile?.decision_style ?? "Growth-oriented"}</h2><p>You naturally search for upside and durable opportunities, especially when a situation can scale.</p></article>
      <article className="profile-insight profile-insight-caution"><div className="insight-icon">!</div><small>Weakness</small><h2>{weakness}</h2><p>Promising scenarios can make the downside case easy to overlook. Test what happens when the strongest assumption fails.</p></article>
      <article className="profile-insight profile-insight-wide"><div className="insight-icon">↘</div><small>Most common mistake</small><h2>{profile?.most_common_mistake ?? "Ignoring downside scenarios"}</h2><p>Before locking a decision, deliberately write the strongest downside case and decide which signal would prove it is unfolding.</p></article>
    </div>
    <div className="insight-note"><strong>Your insights evolve with you.</strong><p>These are patterns from your practice—not permanent labels. Stronger evidence from future challenges can change them.</p></div>
  </section>;
}
