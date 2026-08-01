import Link from "next/link";
import { categoryLabel, formatDate } from "@/lib/utils";
import type { Challenge } from "@/types/challenge";
import type { Submission } from "@/types/submission";

export function ChallengeCard({ challenge, submission }: { challenge: Challenge; submission?: Submission }) {
  return <Link className="archive-card" href={`/challenge/${challenge.slug}`}>
    <div className="archive-card-top">
      <span className={`category category-${challenge.category}`}>{categoryLabel(challenge.category)}</span>
      <time>{formatDate(challenge.publish_date)}</time>
    </div>
    <div className="challenge-number">Challenge #{String(challenge.challenge_number).padStart(3, "0")}</div>
    <h2>{challenge.title}</h2>
    <p>{challenge.subtitle}</p>
    <div className="archive-card-foot">
      <span className={`difficulty difficulty-${challenge.difficulty}`}>{challenge.difficulty}</span>
      {submission ? <strong>Completed · {submission.score}</strong> : <strong className="practice-label">Practice →</strong>}
    </div>
  </Link>;
}
