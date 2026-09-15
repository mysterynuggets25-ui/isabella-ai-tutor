import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, dayKey } from "@/lib/streak";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Calendar — her month at a glance: the days she showed up (with a flame), her
// scheduled sessions, and what's due. Showing up is made visible, gently.
export default async function CalendarPage() {
  const supabase = await createClient();
  const [{ data: sessions }, { data: settings }, { data: due }] = await Promise.all([
    supabase.from("sessions").select("started_at").limit(2000),
    supabase.from("settings").select("session_days").eq("id", 1).single(),
    supabase.from("assessments").select("title, due_date, subject_key").eq("done", false).order("due_date"),
  ]);

  const dates = (sessions ?? []).map((s) => new Date(s.started_at));
  const { current, best, days } = computeStreak(dates);
  const sessionDays: string[] = settings?.session_days ?? ["Tue", "Thu", "Sat"];
  const dueByDay = new Map<string, string[]>();
  for (const a of due ?? []) {
    if (!a.due_date) continue;
    const k = dayKey(new Date(a.due_date));
    dueByDay.set(k, [...(dueByDay.get(k) ?? []), a.title]);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayNum = now.getDate();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Calendar</h1>
        <div className="flex items-center gap-2 rounded-2xl bg-terracotta/10 px-4 py-2">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="font-display text-xl text-terracotta-deep">{current}</div>
            <div className="text-[10px] uppercase tracking-wide text-ink/50">day streak</div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-ink/55">
        {current === 0 ? "Do a session today to light the flame." : `You've shown up ${current} day${current > 1 ? "s" : ""} in a row. Best: ${best}.`}
      </p>

      <div className="mt-6 rounded-3xl border border-sand bg-paper p-4 sm:p-5">
        <div className="mb-3 text-center font-display text-lg">{monthName}</div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink/40">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((n, i) => {
            if (n === null) return <div key={i} />;
            const date = new Date(year, month, n);
            const k = dayKey(date);
            const active = days.has(k);
            const scheduled = sessionDays.includes(WD[date.getDay()]);
            const hasDue = dueByDay.has(k);
            const isToday = n === todayNum;
            return (
              <div
                key={i}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm ${
                  active ? "bg-sage text-white" : scheduled ? "border border-sage/40 text-ink/70" : "text-ink/60"
                } ${isToday ? "ring-2 ring-terracotta" : ""}`}
              >
                <span>{n}</span>
                {active && <span className="text-[9px] leading-none">🔥</span>}
                {hasDue && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-terracotta" />}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/50">
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-sage" /> showed up</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-sage/40" /> session day</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-terracotta" /> something due</span>
        </div>
      </div>

      {/* Coming up list */}
      <h2 className="mt-8 text-xl">Coming up</h2>
      <div className="mt-3 space-y-3">
        {(due ?? []).slice(0, 4).map((a, i) => (
          <div key={i} className="flex items-center justify-between rounded-2xl border border-sand bg-paper p-4">
            <div>
              <div className="font-medium">{a.title}</div>
              {a.due_date && <div className="text-xs text-ink/50">Due {new Date(a.due_date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" })}</div>}
            </div>
            {a.subject_key && (
              <Link href={`/session?subject=${a.subject_key}&mode=adhoc`} className="rounded-full bg-terracotta px-4 py-1.5 text-sm font-semibold text-white hover:bg-terracotta-deep">
                Work on it
              </Link>
            )}
          </div>
        ))}
        {(due ?? []).length === 0 && <p className="text-sm text-ink/50">Nothing due right now. Mum adds assessments in her console and they appear here.</p>}
      </div>
    </div>
  );
}
