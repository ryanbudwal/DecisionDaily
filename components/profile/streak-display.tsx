export function StreakDisplay({ current, longest }: { current: number; longest: number }) {
  return <div className="streak-pair">
    <article><span>Current streak</span><b>{current}</b><small>Daily challenges</small></article>
    <article><span>Longest streak</span><b>{longest}</b><small>Personal best</small></article>
  </div>;
}
