import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export function ChallengeCard({ challenge, submission, isCurrent = false }: { challenge: Challenge; submission?: Submission; isCurrent?: boolean }) {
  const isAdvanced = challenge.challenge_mode === "advanced";
  return <Link className="archive-card" href={submission ? `/challenge/${challenge.slug}/results` : isAdvanced ? `/challenge/${challenge.slug}/advanced` : `/challenge/${challenge.slug}`}>
    <div className="archive-card-top">
      <span className="challenge-number">{isAdvanced ? "Advanced Weekly" : "Basic Daily"} · #{String(challenge.challenge_number).padStart(3, "0")}</span>
      <time>{formatDate(challenge.publish_date)}</time>
    </div>
    <div className="archive-card-copy"><h2>{challenge.title}</h2><p>{challenge.subtitle}</p></div>
    <div className="archive-card-foot">
      {isCurrent ? <span className="archive-status archive-status-today">Today</span> : submission ? <span className="archive-status">Score {submission.score}</span> : <span className="archive-status archive-status-missed">Missed</span>}
      <strong className="practice-label">{submission ? "Review" : isCurrent ? "Play" : "Practise"} →</strong>
    </div>
  </Link>;
}
