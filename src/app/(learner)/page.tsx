import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TutorCharacter from "@/components/TutorCharacter";
import PersonaName from "@/components/PersonaName";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Today — Isabella's own hub. A warm greeting, the next session as the hero
// (so it feels scheduled, like a real appointment), her streak, and a way in
// for anything else. Organised, not a wall.
export default async function TodayPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: subjects }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("subjects").select("key,name,blurb").eq("active", true).order("sort_order"),
  ]);

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count: weekCount } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .gte("started_at", weekAgo);

  const active = subjects ?? [];
  const now = new Date();
  const hour = now.getHours();
  const partOfDay = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Work out the next scheduled session day.
  const sessionDays: string[] = settings?.session_days ?? ["Tue", "Thu", "Sat"];
  const dayIdxs = sessionDays.map((d) => DAYS.indexOf(d)).filter((i) => i >= 0);
  const todayIdx = now.getDay();
  const isSessionToday = dayIdxs.includes(todayIdx);
  let daysUntil = 8;
  for (const i of dayIdxs) {
    const delta = (i - todayIdx + 7) % 7 || 7;
    if (delta < daysUntil) daysUntil = delta;
  }
  const nextDayName = DAY_FULL[(todayIdx + daysUntil) % 7];

  // Today's subject by rotation.
  const dayIndex = Math.floor(Date.now() / 86_400_000) % Math.max(active.length, 1);
  const todaySubject = active[dayIndex] ?? active[0];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink/50">{DAY_FULL[todayIdx]}</p>
          <h1 className="mt-0.5 text-2xl font-semibold">{partOfDay}, Isabella</h1>
        </div>
        {(weekCount ?? 0) > 0 && (
          <div className="rounded-2xl bg-gold/15 px-3 py-2 text-center">
            <div className="text-lg font-bold text-gold">🔥 {weekCount}</div>
            <div className="text-[10px] uppercase tracking-wide text-ink/50">this week</div>
          </div>
        )}
      </div>

      {/* Hero: the next session, as an appointment you join */}
      {isSessionToday && todaySubject ? (
        <div className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-deep to-teal text-white shadow-sm">
          <div className="flex items-center gap-4 p-6">
            <div className="shrink-0 rounded-2xl bg-white/10 p-1">
              <TutorCharacter size={64} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Tonight · {settings?.session_length_min ?? 30} min</p>
              <h2 className="mt-1 text-xl font-semibold">{todaySubject.name} with <PersonaName /></h2>
              <p className="text-sm text-white/70">She has tonight planned. One thing at a time.</p>
            </div>
          </div>
          <Link
            href={`/session?subject=${todaySubject.key}&mode=scheduled`}
            className="block bg-coral py-4 text-center text-lg font-semibold text-white hover:bg-coral-deep"
          >
            Join session
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-deep to-teal text-white shadow-sm">
          <div className="flex items-center gap-4 p-6">
            <div className="shrink-0 rounded-2xl bg-white/10 p-1">
              <TutorCharacter size={64} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Next session</p>
              <h2 className="mt-1 text-xl font-semibold">{nextDayName}</h2>
              <p className="text-sm text-white/70">
                {daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`} with <PersonaName />.
              </p>
            </div>
          </div>
          {todaySubject && (
            <Link
              href={`/session?subject=${todaySubject.key}&mode=scheduled`}
              className="block bg-white/10 py-3 text-center font-semibold text-white hover:bg-white/20"
            >
              Start one now anyway
            </Link>
          )}
        </div>
      )}

      {/* Jump in */}
      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink/40">Jump in</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {active.slice(0, 4).map((s) => (
          <Link
            key={s.key}
            href={`/session?subject=${s.key}&mode=adhoc`}
            className="rounded-2xl border border-sand bg-white p-4 hover:border-teal"
          >
            <div className="font-semibold">{s.name}</div>
            <div className="mt-0.5 text-xs text-ink/60">{s.blurb}</div>
          </Link>
        ))}
      </div>

      <Link
        href="/subjects"
        className="mt-3 block rounded-2xl border border-teal py-3 text-center font-semibold text-teal hover:bg-teal hover:text-white"
      >
        Ask <PersonaName /> anything
      </Link>

      <Link href="/tutor" className="mt-3 block text-center text-sm text-ink/50 hover:text-teal">
        🎨 Change how your tutor looks
      </Link>
    </div>
  );
}
