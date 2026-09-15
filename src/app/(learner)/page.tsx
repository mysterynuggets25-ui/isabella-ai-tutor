import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PersonaName from "@/components/PersonaName";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Home — one thing in focus, everything else waiting quietly to the side.
// A reserved teenager opening a laptop after school should see a single line
// telling her where to start, not a wall of data about herself.
export default async function TodayPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: subjects }, { data: due }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("subjects").select("key,name,blurb").eq("active", true).order("sort_order"),
    supabase.from("assessments").select("*").eq("done", false).order("due_date", { ascending: true }).limit(3),
  ]);

  const active = subjects ?? [];
  const now = new Date();
  const hour = now.getHours();
  const partOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const mins = settings?.session_length_min ?? 30;

  const sessionDays: string[] = settings?.session_days ?? ["Tue", "Thu", "Sat"];
  const dayIdxs = sessionDays.map((d) => DAYS.indexOf(d)).filter((i) => i >= 0);
  const todayIdx = now.getDay();
  const isSessionToday = dayIdxs.includes(todayIdx);
  const dayIndex = Math.floor(Date.now() / 86_400_000) % Math.max(active.length, 1);
  const focus = active[dayIndex] ?? active[0];

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-ink/40">{DAY_FULL[todayIdx]} {partOfDay}</p>
      <h1 className="mt-2 text-3xl leading-tight">
        Hi Isabella. {isSessionToday && focus
          ? <>{mins} minutes and the hard part of {focus.name.toLowerCase()} is done.</>
          : <>a little now beats a lot later.</>}
      </h1>

      <div className="mt-8 grid gap-5 md:grid-cols-[1.5fr_1fr]">
        {/* Start here */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-sage to-sage-deep text-white">
          <div className="p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-white/60">Start here</p>
            <h2 className="mt-2 text-2xl">{focus ? focus.name : "Pick a subject"}</h2>
            <p className="mt-2 text-sm text-white/75">
              {focus?.blurb ? `${focus.blurb}. ` : ""}We&apos;ll do one thing, together, and stop when it&apos;s done.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {focus && (
                <Link
                  href={`/session?subject=${focus.key}&mode=scheduled`}
                  className="rounded-full bg-terracotta px-6 py-2.5 font-semibold text-white hover:bg-terracotta-deep"
                >
                  Start with <PersonaName />
                </Link>
              )}
              <Link href="/subjects" className="rounded-full border border-white/40 px-5 py-2.5 text-white/90 hover:bg-white/10">
                Something else
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/60">
              Not feeling it today? <Link href={focus ? `/session?subject=${focus.key}&mode=adhoc` : "/subjects"} className="underline">Do ten minutes instead</Link> — that still counts.
            </p>
          </div>
        </div>

        {/* Later this week */}
        <div className="rounded-3xl border border-sand bg-paper p-6">
          <p className="text-xs uppercase tracking-[0.15em] text-ink/40">Later this week</p>
          {(due ?? []).length > 0 ? (
            <ul className="mt-3 space-y-3">
              {(due ?? []).map((d) => (
                <li key={d.id} className="rounded-xl border border-sand p-3">
                  <div className="text-sm font-semibold">{d.title}</div>
                  {d.due_date && <div className="text-xs text-ink/50">Due {new Date(d.due_date).toLocaleDateString("en-AU", { weekday: "long" })}</div>}
                  {d.next_step && <div className="mt-1 text-xs text-ink/60">{d.next_step}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink/55">
              Nothing due that I know about. Your assessments will show up here once they&apos;re added. That&apos;s everything, nothing else hiding.
            </p>
          )}
        </div>
      </div>

      <Link href="/tutor" className="mt-8 inline-block text-sm text-ink/45 hover:text-sage">
        Change your tutor
      </Link>
    </div>
  );
}
