import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export function ChallengeCard({ challenge, submission, isToday = false }: { challenge: Challenge; submission?: Submission; isToday?: boolean }) {
  return <Link className="archive-card" href={`/challenge/${challenge.slug}`}>
    <div className="archive-card-top">
      <span className="challenge-number">Challenge #{String(challenge.challenge_number).padStart(3, "0")}</span>
      <time>{formatDate(challenge.publish_date)}</time>
    </div>
    <div className="archive-card-copy"><h2>{challenge.title}</h2><p>{challenge.subtitle}</p></div>
    <div className="archive-card-foot">
      {isToday ? <span className="archive-status archive-status-today">Today</span> : submission ? <span className="archive-status">Score {submission.score}</span> : <span className="archive-status archive-status-missed">Missed</span>}
      <strong className="practice-label">{submission ? "Review" : isToday ? "Play" : "Practise"} →</strong>
    </div>
  </Link>;
}
