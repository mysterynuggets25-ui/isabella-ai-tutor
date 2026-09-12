import { createClient } from "@/lib/supabase/server";

// Me — gamification that rewards showing up and effort, never being right.
// No leaderboards, no scores, nothing to lose.
export default async function MePage() {
  const supabase = await createClient();

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: recent } = await supabase
    .from("sessions")
    .select("id,started_at")
    .gte("started_at", weekAgo);
  const { count: total } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true });

  const thisWeek = recent?.length ?? 0;
  const questTarget = 3;
  const totalSessions = total ?? 0;

  const badges = [
    { label: "First session", earned: totalSessions >= 1 },
    { label: "3 in a week", earned: thisWeek >= 3 },
    { label: "10 sessions", earned: totalSessions >= 10 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Isabella</h1>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <Stat value={thisWeek} label="this week" />
        <Stat value={totalSessions} label="sessions" />
        <Stat value={badges.filter((b) => b.earned).length} label="badges" />
      </div>

      <div className="mt-6 rounded-2xl border border-sand bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">This week&apos;s quest</h2>
          <span className="text-sm text-ink/60">
            {Math.min(thisWeek, questTarget)} of {questTarget}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand">
          <div
            className="h-full bg-teal"
            style={{ width: `${Math.min(100, (thisWeek / questTarget) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-ink/60">Three sessions. Resets Sunday. A missed night is fine.</p>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold">Badges</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {badges.map((b) => (
            <div
              key={b.label}
              className={`rounded-2xl border p-3 text-center text-xs ${
                b.earned
                  ? "border-gold bg-gold/10 text-ink"
                  : "border-sand bg-white text-ink/30"
              }`}
            >
              {b.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-3">
      <div className="text-2xl font-semibold text-teal">{value}</div>
      <div className="text-xs text-ink/60">{label}</div>
    </div>
  );
}
