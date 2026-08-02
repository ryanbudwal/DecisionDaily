"use client";

import { useEffect, useMemo, useState } from "react";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { getChallenges, getSubmissions } from "@/lib/challenges/queries";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export default function ArchivePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([getChallenges(), getSubmissions()])
      .then(([nextChallenges, nextSubmissions]) => {
        setChallenges(nextChallenges);
        setSubmissions(nextSubmissions);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const archive = useMemo(
    () => challenges.filter((_, index) => index > 0),
    [challenges],
  );
  const completionRate = challenges.length ? Math.round((submissions.length / challenges.length) * 100) : 0;
  const averageScore = submissions.length ? Math.round(submissions.reduce((sum, item) => sum + item.score, 0) / submissions.length) : 0;

  return <section className="archive-page">
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="page-heading">
      <div><span className="section-kicker">Practice library</span><h1>Challenge archive</h1><p>Complete anything you missed. Every past challenge stays available permanently.</p></div>
      <div className="archive-stats"><article><b>{submissions.length}</b><span>Completed</span></article><article><b>{averageScore || "—"}</b><span>Avg. process score</span></article><article><b>{completionRate}%</b><span>Archive progress</span></article></div>
    </div>
    <div className="archive-grid">
      {archive.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} submission={submissions.find((item) => item.challenge_id === challenge.id)} />)}
    </div>
  </section>;
}
