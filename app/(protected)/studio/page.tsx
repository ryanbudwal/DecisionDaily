"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-gate";
import { getChallengeStudio, getCurrentReleaseDate, publishChallenge, saveChallengeDraft } from "@/lib/challenges/queries";
import type { Evidence } from "@/types/challenge";
import type { ChallengeDraft, StudioChoice } from "@/types/challenge-studio";

const choiceGroups = [
  { type: "reasoning" as const, title: "Reasoning cards", note: "Best card can score up to 30.", max: 30 },
  { type: "risk" as const, title: "Risk cards", note: "Best card can score up to 25.", max: 25 },
  { type: "change_mind" as const, title: "Change-signal cards", note: "Best card can score up to 20.", max: 20 },
];

function blankEvidence(): Evidence {
  return { label: "", value: "", detail: "", tone: "neutral" };
}

function blankChoices(): StudioChoice[] {
  return choiceGroups.flatMap(({ type, max }) => [0, 1, 2, 3].map((_, index) => ({
    prompt_type: type,
    option_text: "",
    points: Math.max(0, max - index * 6),
    feedback: "",
  })));
}

type StudioTrack = "basic" | "advanced";

function blankDraft(releaseDate = "", challengeMode: StudioTrack = "basic"): ChallengeDraft {
  return {
    challenge_mode: challengeMode, slug: "", publish_date: releaseDate, difficulty: challengeMode === "basic" ? "intermediate" : "advanced", title: "", subtitle: "", scenario: "",
    decision_prompt: "As an investor, what would you do today?",
    evidence: [blankEvidence(), blankEvidence(), blankEvidence()],
    decision_options: ["Buy", "Hold", "Reduce", "Avoid"],
    source_note: "Based on a real historical market situation, simplified for education.",
    basic_choices: challengeMode === "basic" ? blankChoices() : [],
    outcome: { outcome_title: "", outcome_summary: "", result_label: "", benchmark_label: "", benchmark_result: "", learning_points: [""] },
  };
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeDraft(draft: ChallengeDraft): ChallengeDraft {
  return {
    ...draft,
    source_note: draft.source_note ?? "",
    evidence: draft.evidence.map((item) => ({ ...item })),
    decision_options: [...draft.decision_options],
    basic_choices: draft.basic_choices.map((item) => ({ ...item })),
    outcome: { ...draft.outcome, learning_points: [...draft.outcome.learning_points] },
  };
}

export default function ChallengeStudioPage() {
  const { canManageChallenges } = useAuth();
  const [track, setTrack] = useState<StudioTrack>("basic");
  const [drafts, setDrafts] = useState<ChallengeDraft[]>([]);
  const [draft, setDraft] = useState<ChallengeDraft>(() => blankDraft());
  const [releaseDate, setReleaseDate] = useState("");
  const [loading, setLoading] = useState(canManageChallenges);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadStudio() {
    const [items, today] = await Promise.all([getChallengeStudio(), getCurrentReleaseDate()]);
    setDrafts(items);
    setReleaseDate(today);
    setDraft((current) => current.publish_date ? current : { ...current, publish_date: today });
    return items;
  }

  useEffect(() => {
    if (!canManageChallenges) return;
    let active = true;
    void Promise.all([getChallengeStudio(), getCurrentReleaseDate()])
      .then(([items, today]) => {
        if (!active) return;
        setDrafts(items);
        setReleaseDate(today);
        setDraft((current) => current.publish_date ? current : { ...current, publish_date: today });
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canManageChallenges]);

  const unpublished = useMemo(() => drafts.filter((item) => !item.is_published && item.challenge_mode === track), [drafts, track]);
  const published = useMemo(() => drafts.filter((item) => item.is_published && (item.challenge_mode === track || item.challenge_mode === "both")), [drafts, track]);

  function setField<K extends keyof ChallengeDraft>(field: K, value: ChallengeDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateEvidence(index: number, field: keyof Evidence, value: string) {
    setDraft((current) => ({ ...current, evidence: current.evidence.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  }

  function updateChoice(type: StudioChoice["prompt_type"], index: number, field: keyof StudioChoice, value: string | number) {
    setDraft((current) => {
      let groupIndex = -1;
      return { ...current, basic_choices: current.basic_choices.map((item) => {
        if (item.prompt_type !== type) return item;
        groupIndex += 1;
        return groupIndex === index ? { ...item, [field]: value } : item;
      }) };
    });
  }

  async function handleSave() {
    setSaving(true); setError(""); setNotice("");
    try {
      const id = await saveChallengeDraft(draft);
      const items = await loadStudio();
      const saved = items.find((item) => item.id === id);
      if (saved) setDraft(normalizeDraft(saved));
      setNotice(`Challenge #${saved?.challenge_number ?? id} saved as a private draft.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The draft could not be saved.");
    } finally { setSaving(false); }
  }

  async function handlePublish(item: ChallengeDraft) {
    if (!item.id || !window.confirm(`Publish “${item.title}” for ${item.publish_date}? This makes it available to players on that Eastern date.`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await publishChallenge(item.id);
      await loadStudio();
      setNotice(`“${item.title}” is published for ${item.publish_date}.`);
      if (draft.id === item.id) setDraft(blankDraft(releaseDate, track));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The challenge could not be published.");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="route-loading"><span>DD</span><p>Opening the private studio…</p></div>;
  if (!canManageChallenges) return <div className="route-error" role="alert">This private page is available only to the Decision Daily owner.</div>;

  return <section className="studio-page">
    <div className="studio-heading">
      <div><span className="section-kicker">Owner-only workspace</span><h1>Challenge studio</h1><p>Manage Basic Daily and Advanced Weekly as separate editorial tracks, each with its own drafts, scenarios, outcomes, and publishing schedule.</p></div>
      <button type="button" className="studio-new" onClick={() => { setDraft(blankDraft(releaseDate, track)); setError(""); setNotice(""); }}>+ New {track} challenge</button>
    </div>
    <div className="studio-track-tabs" role="tablist" aria-label="Challenge publishing track">
      <button type="button" role="tab" aria-selected={track === "basic"} className={track === "basic" ? "active" : ""} onClick={() => { setTrack("basic"); setDraft(blankDraft(releaseDate, "basic")); }}><span>Basic Daily</span><small>One quick challenge each day</small></button>
      <button type="button" role="tab" aria-selected={track === "advanced"} className={track === "advanced" ? "active" : ""} onClick={() => { setTrack("advanced"); setDraft(blankDraft(releaseDate, "advanced")); }}><span>Advanced Weekly</span><small>One deep-analysis challenge each week</small></button>
    </div>
    {(error || notice) && <div className={error ? "studio-message studio-error" : "studio-message studio-success"} role={error ? "alert" : "status"}>{error || notice}</div>}

    <div className="studio-layout">
      <aside className="studio-library">
        <div><span>Private drafts</span><b>{unpublished.length}</b></div>
        {unpublished.length === 0 && <p>No drafts yet.</p>}
        {unpublished.map((item) => <article key={item.id} className={draft.id === item.id ? "active" : ""}>
          <small>{item.publish_date}</small><h2>{item.title}</h2><p>Challenge #{String(item.challenge_number).padStart(3, "0")}</p>
          <div><button type="button" onClick={() => { setTrack(item.challenge_mode === "advanced" ? "advanced" : "basic"); setDraft(normalizeDraft(item)); setError(""); setNotice(""); }}>Edit</button><button type="button" className="publish" disabled={saving} onClick={() => void handlePublish(item)}>Publish</button></div>
        </article>)}
        <div className="studio-published-title"><span>Published</span><b>{published.length}</b></div>
        {published.slice(0, 8).map((item) => <article key={item.id} className="published"><small>{item.publish_date}</small><h2>{item.title}</h2><p>Challenge #{String(item.challenge_number).padStart(3, "0")} · Live</p></article>)}
      </aside>

      <form className="studio-form" onSubmit={(event) => { event.preventDefault(); void handleSave(); }}>
        <div className="studio-form-title"><div><span>{draft.id ? `Editing challenge #${String(draft.challenge_number).padStart(3, "0")}` : "New private draft"}</span><h2>{track === "basic" ? "Basic Daily" : "Advanced Weekly"}</h2></div><small>Today in Toronto: {releaseDate}</small></div>

        <fieldset><legend>Release</legend><div className="studio-fields studio-fields-3">
          <label><span>Eastern release date</span><input type="date" required value={draft.publish_date} onChange={(event) => setField("publish_date", event.target.value)} /></label>
          <label><span>Difficulty</span><select value={draft.difficulty} onChange={(event) => setField("difficulty", event.target.value as ChallengeDraft["difficulty"])}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
          <label><span>URL slug</span><input required value={draft.slug} placeholder="company-decision" onChange={(event) => setField("slug", slugify(event.target.value))} /></label>
        </div></fieldset>

        <fieldset><legend>{track === "basic" ? "Basic scenario" : "Advanced scenario"}</legend><div className="studio-fields">
          <label><span>Title</span><input required value={draft.title} onChange={(event) => { const title = event.target.value; setDraft((current) => ({ ...current, title, slug: current.id || current.slug ? current.slug : slugify(title) })); }} /></label>
          <label><span>Subtitle</span><input required value={draft.subtitle} onChange={(event) => setField("subtitle", event.target.value)} /></label>
          <label className="wide"><span>Scenario</span><textarea required rows={7} value={draft.scenario} onChange={(event) => setField("scenario", event.target.value)} /></label>
          <label className="wide"><span>Decision prompt</span><input required value={draft.decision_prompt} onChange={(event) => setField("decision_prompt", event.target.value)} /></label>
          <label className="wide"><span>Source note</span><input value={draft.source_note} onChange={(event) => setField("source_note", event.target.value)} /></label>
          <label className="wide"><span>Decision options · one per line</span><textarea required rows={4} value={draft.decision_options.join("\n")} onChange={(event) => setField("decision_options", event.target.value.split("\n").map((value) => value.trim()).filter(Boolean))} /></label>
        </div></fieldset>

        <fieldset><legend>Evidence cards</legend><p className="studio-help">These facts are visible in both modes before the player decides.</p>
          <div className="studio-repeat-list">{draft.evidence.map((item, index) => <div className="studio-evidence-row" key={index}>
            <label><span>Label</span><input required value={item.label} onChange={(event) => updateEvidence(index, "label", event.target.value)} /></label>
            <label><span>Value</span><input required value={item.value} onChange={(event) => updateEvidence(index, "value", event.target.value)} /></label>
            <label><span>Tone</span><select value={item.tone} onChange={(event) => updateEvidence(index, "tone", event.target.value)}><option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option></select></label>
            <label className="detail"><span>Explanation</span><input required value={item.detail} onChange={(event) => updateEvidence(index, "detail", event.target.value)} /></label>
            {draft.evidence.length > 2 && <button type="button" aria-label={`Remove evidence card ${index + 1}`} onClick={() => setField("evidence", draft.evidence.filter((_, itemIndex) => itemIndex !== index))}>×</button>}
          </div>)}</div>
          {draft.evidence.length < 8 && <button className="studio-add-row" type="button" onClick={() => setField("evidence", [...draft.evidence, blankEvidence()])}>+ Add evidence card</button>}
        </fieldset>

        {track === "basic" && <fieldset><legend>Basic mode cards and private scoring</legend><p className="studio-help">Players see the card text. Points and feedback stay protected until a valid result is revealed.</p>
          {choiceGroups.map((group) => <section className="studio-choice-group" key={group.type}><div><h3>{group.title}</h3><small>{group.note}</small></div>
            {draft.basic_choices.filter((item) => item.prompt_type === group.type).map((item, index) => <div className="studio-choice-row" key={index}>
              <b>{index + 1}</b>
              <label><span>Card text</span><textarea required rows={3} value={item.option_text} onChange={(event) => updateChoice(group.type, index, "option_text", event.target.value)} /></label>
              <label className="points"><span>Private points</span><input type="number" min="0" max={group.max} required value={item.points} onChange={(event) => updateChoice(group.type, index, "points", Number(event.target.value))} /></label>
              <label><span>Feedback after reveal</span><textarea required rows={3} value={item.feedback} onChange={(event) => updateChoice(group.type, index, "feedback", event.target.value)} /></label>
            </div>)}
          </section>)}
        </fieldset>}

        <fieldset><legend>Protected historical outcome</legend><p className="studio-help">This stays hidden until an official result or valid archive-practice result.</p><div className="studio-fields">
          <label><span>Outcome title</span><input required value={draft.outcome.outcome_title} onChange={(event) => setField("outcome", { ...draft.outcome, outcome_title: event.target.value })} /></label>
          <label><span>Result label</span><input required value={draft.outcome.result_label} placeholder="Approximately +18%" onChange={(event) => setField("outcome", { ...draft.outcome, result_label: event.target.value })} /></label>
          <label className="wide"><span>Outcome summary</span><textarea required rows={6} value={draft.outcome.outcome_summary} onChange={(event) => setField("outcome", { ...draft.outcome, outcome_summary: event.target.value })} /></label>
          <label><span>Benchmark label</span><input value={draft.outcome.benchmark_label} onChange={(event) => setField("outcome", { ...draft.outcome, benchmark_label: event.target.value })} /></label>
          <label><span>Benchmark result</span><input value={draft.outcome.benchmark_result} onChange={(event) => setField("outcome", { ...draft.outcome, benchmark_result: event.target.value })} /></label>
          <label className="wide"><span>Learning points · one per line</span><textarea required rows={5} value={draft.outcome.learning_points.join("\n")} onChange={(event) => setField("outcome", { ...draft.outcome, learning_points: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} /></label>
        </div></fieldset>

        <div className="studio-actions"><div><strong>{draft.is_published ? "Published challenges are locked." : "Saving keeps this private."}</strong><span>Publishing is a separate, confirmed action from the draft list.</span></div><button type="submit" disabled={saving || draft.is_published}>{saving ? "Saving…" : draft.id ? "Save draft changes" : "Save private draft"}</button></div>
      </form>
    </div>
  </section>;
}
