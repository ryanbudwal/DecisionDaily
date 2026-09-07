"use client";

import { useEffect, useMemo, useState } from "react";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { getChallenges, getCurrentReleaseDate, getSubmissions } from "@/lib/challenges/queries";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export default function ArchivePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [releaseDate, setReleaseDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([getChallenges(), getSubmissions(), getCurrentReleaseDate()])
      .then(([nextChallenges, nextSubmissions, nextReleaseDate]) => {
        setChallenges(nextChallenges);
        setSubmissions(nextSubmissions);
        setReleaseDate(nextReleaseDate);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const basicArchive = useMemo(() => challenges.filter((item) => item.challenge_mode !== "advanced"), [challenges]);
  const advancedArchive = useMemo(() => challenges.filter((item) => item.challenge_mode === "advanced"), [challenges]);
  const completionRate = challenges.length ? Math.round((submissions.length / challenges.length) * 100) : 0;
  const averageScore = submissions.length ? Math.round(submissions.reduce((sum, item) => sum + item.score, 0) / submissions.length) : 0;

  return <section className="archive-page">
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="page-heading">
      <div><span className="section-kicker">Practice library</span><h1>Challenge archive</h1><p>Basic Daily and Advanced Weekly scenarios, kept separately and available for practice.</p></div>
      <div className="archive-summary"><b>{submissions.length}/{challenges.length}</b><span>completed · {averageScore || "—"} average · {completionRate}% progress</span></div>
    </div>
    <div className="archive-section-title"><span>Basic Daily</span><small>Quick decisions released each day</small></div>
    <div className="archive-grid">{basicArchive.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} submission={submissions.find((item) => item.challenge_id === challenge.id)} isCurrent={challenge.publish_date === releaseDate} />)}</div>
    <div className="archive-section-title archive-section-advanced"><span>Advanced Weekly</span><small>Deep-analysis challenges released weekly</small></div>
    <div className="archive-grid">{advancedArchive.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} submission={submissions.find((item) => item.challenge_id === challenge.id)} isCurrent={challenge.publish_date === releaseDate} />)}</div>
  </section>;
}
