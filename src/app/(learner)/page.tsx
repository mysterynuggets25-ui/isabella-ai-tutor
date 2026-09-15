import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PersonaName from "@/components/PersonaName";
import TutorCharacter from "@/components/TutorCharacter";
import { computeStreak } from "@/lib/streak";
import type { Animal } from "@/lib/persona";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONDAY_EPOCH = Date.UTC(2020, 0, 6);

const SANCTUARY: { animal: Animal; color: string }[] = [
  { animal: "pig", color: "#e8a0a0" },
  { animal: "rabbit", color: "#d9a05f" },
  { animal: "cat", color: "#8a8f7a" },
  { animal: "fox", color: "#c1673f" },
  { animal: "owl", color: "#6e7d58" },
  { animal: "bear", color: "#7a6a5a" },
];

// Home — Isabella's own hub. Warm and a little alive (Penny is here), but still
// one clear thing to start. Everything else is a calm glance, not a wall.
export default async function TodayPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: subjects }, { data: sessions }, { data: due }, { data: profiles }] =
    await Promise.all([
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("subjects").select("key,name,blurb").eq("active", true).order("sort_order"),
      supabase.from("sessions").select("started_at").limit(2000),
      supabase.from("assessments").select("title,due_date,subject_key").eq("done", false).order("due_date").limit(3),
      supabase.from("learner_profile").select("subject_key,dimensions"),
    ]);

  const active = subjects ?? [];
  const all = sessions ?? [];
  const now = new Date();
  const hour = now.getHours();
  const partOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const mins = settings?.session_length_min ?? 30;
  const todayIdx = now.getDay();

  const { current: streak } = computeStreak(all.map((s) => new Date(s.started_at)));
  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = all.filter((s) => new Date(s.started_at).getTime() >= weekAgo).length;

  const perWeek = new Map<number, number>();
  for (const s of all) {
    const wk = Math.floor((new Date(s.started_at).getTime() - MONDAY_EPOCH) / (7 * 86_400_000));
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  }
  const unlocked = Math.min([...perWeek.values()].filter((n) => n >= 3).length, SANCTUARY.length);

  const sessionDays: string[] = settings?.session_days ?? ["Tue", "Thu", "Sat"];
  const isSessionToday = sessionDays.map((d) => DAYS.indexOf(d)).includes(todayIdx);
  const dayIndex = Math.floor(Date.now() / 86_400_000) % Math.max(active.length, 1);
  const focus = active[dayIndex] ?? active[0];
  const focusKey = focus?.key;
  const plan = focusKey
    ? (((profiles ?? []).find((p) => p.subject_key === focusKey)?.dimensions as Record<string, unknown>)?._next_focus as string | undefined)
    : undefined;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-ink/40">{DAY_FULL[todayIdx]} {partOfDay}</p>
          <h1 className="mt-1 text-3xl leading-tight">Hi Isabella</h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-terracotta/10 px-3 py-2">
            <span className="text-xl">🔥</span>
            <div className="leading-none">
              <div className="font-display text-lg text-terracotta-deep">{streak}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink/50">streak</div>
            </div>
          </div>
        )}
      </div>

      {/* Hero — Penny + today's focus */}
      <div className="mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sage to-sage-deep text-white">
        <div className="flex items-stretch">
          <div className="flex items-end justify-center overflow-hidden px-2 pt-4 sm:px-4">
            <TutorCharacter size={112} full />
          </div>
          <div className="flex-1 p-5 pl-1 sm:p-6 sm:pl-2">
            <p className="text-xs uppercase tracking-[0.15em] text-white/60">
              {isSessionToday ? `Tonight · ${mins} min` : "Start here"}
            </p>
            <h2 className="mt-1 text-xl leading-snug">{focus ? focus.name : "Pick a subject"} with <PersonaName /></h2>
            <p className="mt-1 text-sm text-white/75">
              {plan ? plan : focus?.blurb ? focus.blurb : "One thing, together, then we stop."}
            </p>
            {focus && (
              <Link
                href={`/session?subject=${focus.key}&mode=scheduled`}
                className="mt-4 inline-block rounded-full bg-terracotta px-6 py-2.5 font-semibold text-white shadow hover:bg-terracotta-deep"
              >
                {isSessionToday ? "Join session" : "Start a session"}
              </Link>
            )}
          </div>
        </div>
        <Link
          href={focus ? `/session?subject=${focus.key}&mode=adhoc` : "/subjects"}
          className="block border-t border-white/10 bg-black/10 py-2.5 text-center text-xs text-white/70 hover:bg-black/20"
        >
          Not feeling it? Do ten minutes instead — that still counts.
        </Link>
      </div>

      {/* Sanctuary peek + this week */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link href="/me" className="rounded-3xl border border-sand bg-paper p-5 hover:border-sage">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Your corner</span>
            <span className="text-xs text-ink/45">{unlocked} of {SANCTUARY.length}</span>
          </div>
          <div className="mt-3 flex gap-1">
            {SANCTUARY.map((a, i) => (
              <div key={a.animal} className={i < unlocked ? "" : "opacity-20 grayscale"}>
                <TutorCharacter size={38} look={{ animal: a.animal, color: a.color }} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink/50">A friend joins each week you show up.</p>
        </Link>

        <Link href="/calendar" className="rounded-3xl border border-sand bg-paper p-5 hover:border-sage">
          <span className="text-sm font-semibold">Later this week</span>
          {(due ?? []).length > 0 ? (
            <ul className="mt-3 space-y-2">
              {(due ?? []).map((d, i) => (
                <li key={i} className="text-sm">
                  <span className="text-ink/80">{d.title}</span>
                  {d.due_date && <span className="text-xs text-ink/45"> · {new Date(d.due_date).toLocaleDateString("en-AU", { weekday: "short" })}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink/55">{thisWeek} session{thisWeek === 1 ? "" : "s"} this week. Nothing else due right now.</p>
          )}
          <p className="mt-2 text-xs text-ink/45">See your calendar →</p>
        </Link>
      </div>

      {/* Quick tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile href="/work" label="Bring work in" emoji="📷" />
        <Tile href="/cheat-sheets" label="Cheat sheet" emoji="📝" />
        <Tile href="/subjects" label="Any subject" emoji="💬" />
        <Tile href="/tutor" label="Your tutor" emoji="🎨" />
      </div>
    </div>
  );
}

function Tile({ href, label, emoji }: { href: string; label: string; emoji: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-sand bg-paper p-4 text-center hover:border-sage">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-xs font-medium text-ink/70">{label}</div>
    </Link>
  );
}
