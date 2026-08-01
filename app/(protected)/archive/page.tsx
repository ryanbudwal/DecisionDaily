"use client";

import { useEffect, useMemo, useState } from "react";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { getChallenges, getSubmissions } from "@/lib/challenges/queries";
import { categories } from "@/lib/utils";
import type { Category, Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export default function ArchivePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"all" | Category>("all");
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
    () => challenges.filter((item, index) => index > 0 && (filter === "all" || item.category === filter)),
    [challenges, filter],
  );
  const completionRate = challenges.length ? Math.round((submissions.length / challenges.length) * 100) : 0;
  const averageScore = submissions.length ? Math.round(submissions.reduce((sum, item) => sum + item.score, 0) / submissions.length) : 0;

  return <section className="archive-page">
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="page-heading">
      <div><span className="section-kicker">Practice library</span><h1>Challenge archive</h1><p>Complete anything you missed. Every past challenge stays available permanently.</p></div>
      <div className="archive-stats"><article><b>{submissions.length}</b><span>Completed</span></article><article><b>{averageScore || "—"}</b><span>Avg. process score</span></article><article><b>{completionRate}%</b><span>Archive progress</span></article></div>
    </div>
    <div className="filter-row" role="group" aria-label="Filter challenges by category">
      {categories.map((item) => <button key={item.value} className={filter === item.value ? "selected" : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}
    </div>
    <div className="archive-grid">
      {archive.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} submission={submissions.find((item) => item.challenge_id === challenge.id)} />)}
    </div>
  </section>;
}
