"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthGate } from "./AuthGate";
import { supabase } from "@/lib/supabase";

type Evidence = { label: string; value: string; detail: string; tone: "positive" | "negative" | "neutral" };
type Category = "economics" | "investing" | "personal-finance" | "business" | "real-estate" | "crypto" | "markets" | "entrepreneurship";
type Challenge = {
  id: number;
  slug: string;
  challenge_number: number;
  publish_date: string;
  category: Category;
  difficulty: "beginner" | "intermediate" | "advanced";
  title: string;
  subtitle: string;
  scenario: string;
  decision_prompt: string;
  evidence: Evidence[];
  decision_options: string[];
  source_note: string | null;
};
type ScorePart = { score: number; max: number };
type Submission = {
  id: number;
  challenge_id: number;
  user_id: string;
  decision: string;
  allocation_percent: number;
  confidence_percent: number;
  reasoning: string;
  risks: string[];
  change_my_mind: string;
  score: number;
  scoring_breakdown: Record<string, ScorePart>;
  submitted_at: string;
};
type ScoreRecord = {
  submission_id: number;
  overall_score: number;
  scoring_breakdown: Record<string, ScorePart>;
};
type Outcome = {
  challenge_id: number;
  outcome_title: string;
  outcome_summary: string;
  result_label: string;
  benchmark_label: string | null;
  benchmark_result: string | null;
  learning_points: string[];
};

const categories: { value: "all" | Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "investing", label: "Investing" },
  { value: "economics", label: "Economics" },
  { value: "personal-finance", label: "Personal finance" },
  { value: "business", label: "Business" },
  { value: "real-estate", label: "Real estate" },
  { value: "crypto", label: "Crypto" },
  { value: "markets", label: "Markets" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
];

const categoryLabel = (category: Category) => categories.find((item) => item.value === category)?.label ?? category;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function DailyPlatform() {
  const [user, setUser] = useState<User | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [view, setView] = useState<"today" | "archive" | "method">("today");
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState("");
  const [allocation, setAllocation] = useState(10);
  const [confidence, setConfidence] = useState(60);
  const [reasoning, setReasoning] = useState("");
  const [risks, setRisks] = useState("");
  const [changeMind, setChangeMind] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedSubmission = useMemo(
    () => submissions.find((item) => item.challenge_id === selected?.id) ?? null,
    [selected, submissions],
  );

  const loadOutcome = useCallback(async (challengeId: number) => {
    const { data } = await supabase.from("challenge_outcomes").select("*").eq("challenge_id", challengeId).maybeSingle();
    setOutcome((data as Outcome | null) ?? null);
  }, []);

  const loadPlatform = useCallback(async () => {
    setLoading(true);
    setError("");
    const [{ data: userData }, challengeResult, submissionResult, scoreResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("daily_challenges").select("*").order("publish_date", { ascending: false }),
      supabase.from("challenge_submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("scores").select("submission_id, overall_score, scoring_breakdown"),
    ]);

    if (challengeResult.error || submissionResult.error || scoreResult.error) {
      setError(challengeResult.error?.message ?? submissionResult.error?.message ?? scoreResult.error?.message ?? "Could not load DecisionLab.");
      setLoading(false);
      return;
    }

    const nextChallenges = (challengeResult.data ?? []) as Challenge[];
    const scoreBySubmission = new Map(
      ((scoreResult.data ?? []) as ScoreRecord[]).map((score) => [score.submission_id, score]),
    );
    const nextSubmissions = ((submissionResult.data ?? []) as Submission[]).map((submission) => {
      const score = scoreBySubmission.get(submission.id);
      return score ? { ...submission, score: score.overall_score, scoring_breakdown: score.scoring_breakdown } : submission;
    });
    setUser(userData.user);
    setChallenges(nextChallenges);
    setSubmissions(nextSubmissions);
    setSelected((current) => current ? nextChallenges.find((item) => item.id === current.id) ?? nextChallenges[0] : nextChallenges[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { loadPlatform(); }, [loadPlatform]);
  useEffect(() => {
    setOutcome(null);
    if (selectedSubmission && selected) loadOutcome(selected.id);
    if (selected && !selectedSubmission) {
      setDecision(selected.decision_options[0] ?? "");
      setAllocation(10);
      setConfidence(60);
      setReasoning("");
      setRisks("");
      setChangeMind("");
    }
  }, [selected, selectedSubmission, loadOutcome]);

  const todayChallenge = challenges[0] ?? null;
  const archive = useMemo(
    () => challenges.filter((item) => item.id !== todayChallenge?.id && (filter === "all" || item.category === filter)),
    [challenges, filter, todayChallenge],
  );
  const completionRate = challenges.length ? Math.round((submissions.length / challenges.length) * 100) : 0;
  const averageScore = submissions.length ? Math.round(submissions.reduce((sum, item) => sum + item.score, 0) / submissions.length) : 0;
  const ready = reasoning.trim().length >= 60 && changeMind.trim().length >= 20 && risks.split("\n").filter((risk) => risk.trim()).length > 0;

  async function submitDecision() {
    if (!selected || !user || !ready) return;
    setSubmitting(true);
    setError("");
    const payload = {
      user_id: user.id,
      challenge_id: selected.id,
      decision,
      allocation_percent: allocation,
      confidence_percent: confidence,
      reasoning: reasoning.trim(),
      risks: risks.split("\n").map((risk) => risk.trim()).filter(Boolean).slice(0, 8),
      change_my_mind: changeMind.trim(),
    };
    const { data, error: submitError } = await supabase.from("challenge_submissions").insert(payload).select().single();
    if (submitError) {
      setError(submitError.code === "23505" ? "This decision is already locked." : submitError.message);
    } else {
      let saved = data as Submission;
      const { data: scoreData } = await supabase
        .from("scores")
        .select("submission_id, overall_score, scoring_breakdown")
        .eq("submission_id", saved.id)
        .maybeSingle();
      if (scoreData) {
        const persistedScore = scoreData as ScoreRecord;
        saved = { ...saved, score: persistedScore.overall_score, scoring_breakdown: persistedScore.scoring_breakdown };
      }
      setSubmissions((current) => [saved, ...current.filter((item) => item.challenge_id !== saved.challenge_id)]);
      await loadOutcome(selected.id);
    }
    setSubmitting(false);
  }

  function openChallenge(challenge: Challenge) {
    setSelected(challenge);
    setView("today");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <div className="platform-loading"><span>DL</span><p>Loading the daily challenge…</p></div>;

  return <main className="site-shell">
    <header className="app-header">
      <button className="brand brand-button" onClick={() => { setSelected(todayChallenge); setView("today"); }}><span>DL</span> DecisionLab</button>
      <nav aria-label="Primary navigation">
        <button className={view === "today" ? "active" : ""} onClick={() => { setSelected(todayChallenge); setView("today"); }}>Today</button>
        <button className={view === "archive" ? "active" : ""} onClick={() => setView("archive")}>Archive</button>
        <button className={view === "method" ? "active" : ""} onClick={() => setView("method")}>How scoring works</button>
      </nav>
      <div className="header-streak"><span>◆</span><b>{submissions.length}</b><small>completed</small></div>
    </header>

    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}

    {view === "archive" && <section className="archive-page">
      <div className="page-heading">
        <div><span className="section-kicker">Practice library</span><h1>Challenge archive</h1><p>Complete anything you missed. Every past challenge stays available permanently.</p></div>
        <div className="archive-stats"><article><b>{submissions.length}</b><span>Completed</span></article><article><b>{averageScore || "—"}</b><span>Avg. process score</span></article><article><b>{completionRate}%</b><span>Archive progress</span></article></div>
      </div>
      <div className="filter-row" role="group" aria-label="Filter challenges by category">
        {categories.map((item) => <button key={item.value} className={filter === item.value ? "selected" : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}
      </div>
      <div className="archive-grid">
        {archive.map((challenge) => {
          const submission = submissions.find((item) => item.challenge_id === challenge.id);
          return <button className="archive-card" key={challenge.id} onClick={() => openChallenge(challenge)}>
            <div className="archive-card-top"><span className={`category category-${challenge.category}`}>{categoryLabel(challenge.category)}</span><time>{formatDate(challenge.publish_date)}</time></div>
            <div className="challenge-number">Challenge #{String(challenge.challenge_number).padStart(3, "0")}</div>
            <h2>{challenge.title}</h2><p>{challenge.subtitle}</p>
            <div className="archive-card-foot"><span className={`difficulty difficulty-${challenge.difficulty}`}>{challenge.difficulty}</span>{submission ? <strong>Completed · {submission.score}</strong> : <strong className="practice-label">Practice →</strong>}</div>
          </button>;
        })}
      </div>
    </section>}

    {view === "method" && <section className="method-page">
      <span className="section-kicker">Transparent by design</span><h1>We score the process,<br />not the prediction.</h1>
      <p className="method-intro">A profitable outcome can follow weak reasoning. A loss can follow an excellent decision under uncertainty. DecisionLab keeps those ideas separate.</p>
      <div className="score-cards">
        {[{n:"30",title:"Reasoning depth",text:"Did you form a clear, evidence-based case?"},{n:"25",title:"Risk management",text:"Did you identify multiple ways the decision could fail?"},{n:"20",title:"Falsifiability",text:"Did you say what evidence would change your mind?"},{n:"15",title:"Position sizing",text:"Did the capital at risk match the uncertainty?"},{n:"10",title:"Calibration",text:"Was your confidence appropriately measured?"}].map((item) => <article key={item.title}><b>{item.n}</b><div><h2>{item.title}</h2><p>{item.text}</p></div></article>)}
      </div>
      <div className="method-note"><strong>Your decision locks before the outcome appears.</strong><p>The database calculates the score and keeps every submission private to its owner.</p></div>
    </section>}

    {view === "today" && selected && <>
      <section className="daily-hero">
        <div className="daily-label"><span>{selected.id === todayChallenge?.id ? "Today’s challenge" : "Archive practice"}</span><i />{formatDate(selected.publish_date)}</div>
        <div className="hero-main"><div><div className={`category category-${selected.category}`}>{categoryLabel(selected.category)}</div><h1>{selected.title}</h1><p>{selected.subtitle}</p></div><div className="hero-number"><span>Challenge</span><b>#{String(selected.challenge_number).padStart(3, "0")}</b><small>{selected.difficulty}</small></div></div>
        <div className="shared-note"><span>◎</span><p><strong>One shared scenario.</strong> Everyone sees the same evidence before making a decision.</p></div>
      </section>

      <section className="challenge-layout">
        <article className="scenario-column">
          <div className="column-heading"><span>01</span><div><small>Understand the situation</small><h2>Scenario brief</h2></div></div>
          <p className="scenario-copy">{selected.scenario}</p>
          <h3>Information available to you</h3>
          <div className="evidence-grid">
            {selected.evidence.map((item) => <article key={item.label}><div><span className={`signal ${item.tone}`} /><small>{item.label}</small></div><b>{item.value}</b><p>{item.detail}</p></article>)}
          </div>
          <div className="source-lock"><span>⊘</span><p>{selected.source_note}<small>No hindsight is included before submission.</small></p></div>
        </article>

        <aside className="decision-column">
          {!selectedSubmission ? <>
            <div className="column-heading"><span>02</span><div><small>Commit before the reveal</small><h2>Your decision</h2></div></div>
            <p className="decision-prompt">{selected.decision_prompt}</p>
            <fieldset><legend>Choose one action</legend><div className="decision-options">{selected.decision_options.map((option) => <button key={option} className={decision === option ? "selected" : ""} onClick={() => setDecision(option)}>{option}</button>)}</div></fieldset>
            <label className="form-label"><span>Capital at risk</span><b>{allocation}%</b></label><input type="range" min="0" max="100" value={allocation} onChange={(event) => setAllocation(Number(event.target.value))} /><div className="range-scale"><span>0%</span><span>50%</span><span>100%</span></div>
            <label className="form-label" htmlFor="reasoning"><span>Your reasoning</span><b>{reasoning.length}/2000</b></label><textarea id="reasoning" value={reasoning} onChange={(event) => setReasoning(event.target.value)} maxLength={2000} placeholder="Which evidence matters most, and how did you weigh the trade-offs?" />
            <label className="form-label" htmlFor="risks"><span>Key risks</span><b>One per line</b></label><textarea id="risks" className="short-textarea" value={risks} onChange={(event) => setRisks(event.target.value)} placeholder={"Customer churn\nLiquidity pressure\nExecution risk"} />
            <label className="form-label" htmlFor="change-mind"><span>What would change your mind?</span><b>{changeMind.length}/1000</b></label><textarea id="change-mind" className="short-textarea" value={changeMind} onChange={(event) => setChangeMind(event.target.value)} maxLength={1000} placeholder="Name a specific signal or new fact that would make you reconsider." />
            <label className="form-label"><span>Confidence</span><b>{confidence}%</b></label><input type="range" min="1" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /><p className="calibration-note">Confidence is not certainty. Estimate honestly.</p>
            <button className="lock-decision" disabled={!ready || submitting} onClick={submitDecision}>{submitting ? "Locking…" : "Lock decision & reveal"}<span>→</span></button>
            {!ready && <p className="form-requirement">Write at least 60 characters, identify a risk, and say what would change your mind.</p>}
          </> : <div className="reveal-panel">
            <div className="reveal-label">Decision locked</div><h2>Your process score</h2>
            <div className="score-circle" style={{ "--score-angle": `${selectedSubmission.score * 3.6}deg` } as React.CSSProperties}><b>{selectedSubmission.score}</b><span>/100</span></div>
            <div className="locked-choice"><span>Your decision</span><b>{selectedSubmission.decision}</b><small>{selectedSubmission.allocation_percent}% at risk · {selectedSubmission.confidence_percent}% confidence</small></div>
            <div className="breakdown-list">
              {Object.entries(selectedSubmission.scoring_breakdown).map(([key, value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><i><em style={{ width: `${(value.score / value.max) * 100}%` }} /></i><b>{value.score}/{value.max}</b></div>)}
            </div>
            {outcome ? <>
              <div className="outcome-card"><span>What happened</span><h3>{outcome.outcome_title}</h3><b>{outcome.result_label}</b><p>{outcome.outcome_summary}</p>{outcome.benchmark_label && <small>{outcome.benchmark_label}: <strong>{outcome.benchmark_result}</strong></small>}</div>
              <div className="learning-list"><span>Lessons to carry forward</span>{outcome.learning_points.map((point) => <p key={point}>✓ {point}</p>)}</div>
            </> : <div className="outcome-loading">Revealing the outcome…</div>}
            <button className="archive-link" onClick={() => setView("archive")}>Explore the archive →</button>
          </div>}
        </aside>
      </section>
    </>}

    <footer><div><strong>DecisionLab</strong><span>Better thinking, one day at a time.</span></div><p>Educational practice · Transparent scoring · Private journals</p></footer>
  </main>;
}

export default function Home() {
  return <AuthGate><DailyPlatform /></AuthGate>;
}
