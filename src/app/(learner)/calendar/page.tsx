import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, dayKey } from "@/lib/streak";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Calendar — her month at a glance: the days she showed up (with a flame), her
// scheduled sessions, and what's due. Showing up is made visible, gently.
export default async function CalendarPage() {
  const supabase = await createClient();
  const [{ data: sessions }, { data: settings }, { data: due }, { data: subjects }, { data: profiles }] = await Promise.all([
    supabase.from("sessions").select("started_at").limit(2000),
    supabase.from("settings").select("session_days,session_length_min").eq("id", 1).single(),
    supabase.from("assessments").select("title, due_date, subject_key").eq("done", false).order("due_date"),
    supabase.from("subjects").select("key,name").eq("active", true).order("sort_order"),
    supabase.from("learner_profile").select("subject_key,dimensions"),
  ]);

  const dates = (sessions ?? []).map((s) => new Date(s.started_at));
  const { current, best, days } = computeStreak(dates);
  const sessionDays: string[] = settings?.session_days ?? ["Tue", "Thu", "Sat"];
  const active = subjects ?? [];
  const focusByKey = new Map<string, string>();
  for (const p of profiles ?? []) {
    const f = (p.dimensions as Record<string, unknown>)?._next_focus;
    if (typeof f === "string" && f) focusByKey.set(p.subject_key, f);
  }
  const dueByDay = new Map<string, string[]>();
  for (const a of due ?? []) {
    if (!a.due_date) continue;
    const k = dayKey(new Date(a.due_date));
    dueByDay.set(k, [...(dueByDay.get(k) ?? []), a.title]);
  }

  // Build the "Upcoming" list: the next scheduled tutor classes (with their
  // planned topic) + assessments/exams, merged and sorted by date.
  type Ev = { date: Date; kind: "class" | "exam" | "assessment"; title: string; sub?: string; focus?: string };
  const events: Ev[] = [];
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  for (let i = 0; i < 21 && active.length; i++) {
    const d = new Date(today0);
    d.setDate(d.getDate() + i);
    if (!sessionDays.includes(WD[d.getDay()])) continue;
    const sub = active[Math.floor(d.getTime() / 86_400_000) % active.length];
    events.push({ date: d, kind: "class", title: `${sub.name} with tutor`, sub: sub.key, focus: focusByKey.get(sub.key) });
  }
  for (const a of due ?? []) {
    if (!a.due_date) continue;
    const d = new Date(a.due_date);
    if (d < today0) continue;
    const isExam = /exam|test|assessment task/i.test(a.title);
    events.push({ date: d, kind: isExam ? "exam" : "assessment", title: a.title, sub: a.subject_key ?? undefined });
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  const upcoming = events.slice(0, 6);

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

      {/* Upcoming: classes + assessments/exams */}
      <h2 className="mt-8 text-xl">Upcoming</h2>
      <div className="mt-3 space-y-3">
        {upcoming.map((e, i) => {
          const when = e.date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
          const badge = e.kind === "class"
            ? { label: "Class", cls: "bg-sage/15 text-sage-deep" }
            : e.kind === "exam"
            ? { label: "Exam", cls: "bg-terracotta/15 text-terracotta-deep" }
            : { label: "Due", cls: "bg-gold/15 text-gold" };
          return (
            <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-paper p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.cls}`}>{badge.label}</span>
                  <span className="text-xs text-ink/50">{when}</span>
                </div>
                <div className="mt-1 font-medium">{e.title}</div>
                {e.kind === "class" && (
                  <div className="text-xs text-ink/55">{e.focus ? `Plan: ${e.focus}` : "Plan set at the start"}</div>
                )}
              </div>
              {e.sub && (
                <Link
                  href={`/session?subject=${e.sub}&mode=${e.kind === "class" ? "scheduled" : "adhoc"}`}
                  className="shrink-0 rounded-full bg-terracotta px-4 py-1.5 text-sm font-semibold text-white hover:bg-terracotta-deep"
                >
                  {e.kind === "class" ? "Join" : "Prep"}
                </Link>
              )}
            </div>
          );
        })}
        {upcoming.length === 0 && <p className="text-sm text-ink/50">Nothing scheduled right now. Your session days and any assessments Mum adds will appear here.</p>}
      </div>
    </div>
  );
}
