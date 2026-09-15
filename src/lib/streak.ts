// Streak + activity from her session dates. Duolingo-style flame, but forgiving
// by design (this is a reserved kid, not a habit-grinder): the streak stays
// alive if she was active today or yesterday, and we surface the calendar so
// showing up is visible and rewarding rather than punishing.

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeStreak(dates: Date[]): { current: number; best: number; days: Set<string> } {
  const days = new Set(dates.map(dayKey));
  if (days.size === 0) return { current: 0, best: 0, days };

  // Current streak: walk back from today (or yesterday if nothing today yet).
  const today = new Date();
  const start = new Date(today);
  if (!days.has(dayKey(today))) start.setDate(start.getDate() - 1);
  let current = 0;
  const cur = new Date(start);
  while (days.has(dayKey(cur))) {
    current++;
    cur.setDate(cur.getDate() - 1);
  }

  // Best streak across all active days.
  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const now = new Date(sorted[i]);
    const gap = Math.round((now.getTime() - prev.getTime()) / 86_400_000);
    run = gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  return { current, best, days };
}
