import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PersonaName from "@/components/PersonaName";
import TutorCharacter from "@/components/TutorCharacter";
import { computeStreak } from "@/lib/streak";
import { maybeSyncCanvas } from "@/lib/canvas";
import type { Animal } from "@/lib/persona";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONDAY_EPOCH = Date.UTC(2020, 0, 6);

const SUBJECT_META: Record<string, { name: string; emoji: string }> = {
  maths: { name: "Maths", emoji: "🔢" },
  english: { name: "English", emoji: "📖" },
  science: { name: "Science", emoji: "🔬" },
  hsie: { name: "HSIE", emoji: "🌏" },
  pdhpe: { name: "PDHPE", emoji: "⚽" },
  food_tech: { name: "Food Tech", emoji: "🍳" },
  money: { name: "Money", emoji: "💰" },
  christian: { name: "Christian Studies", emoji: "✝️" },
};

const SANCTUARY: { animal: Animal; color: string }[] = [
  { animal: "pig", color: "#e8a0a0" }, { animal: "rabbit", color: "#d9a05f" }, { animal: "cat", color: "#8a8f7a" },
  { animal: "fox", color: "#c1673f" }, { animal: "owl", color: "#6e7d58" }, { animal: "bear", color: "#7a6a5a" },
];

export default async function TodayPage() {
  await maybeSyncCanvas();
  const supabase = await createClient();

  const [{ data: settings }, { data: subjects }, { data: sessions }, { data: due }, { data: profiles }] =
    await Promise.all([
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("subjects").select("key,name,blurb").eq("active", true).order("sort_order"),
      supabase.from("sessions").select("started_at").limit(2000),
      supabase.from("assessments").select("title,due_date,subject_key,next_step").eq("done", false).order("due_date").limit(3),
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
  for (const s of all) perWeek.set(Math.floor((new Date(s.started_at).getTime() - MONDAY_EPOCH) / (7 * 86_400_000)), 0);
  for (const s of all) { const w = Math.floor((new Date(s.started_at).getTime() - MONDAY_EPOCH) / (7 * 86_400_000)); perWeek.set(w, (perWeek.get(w) ?? 0) + 1); }
  const unlocked = Math.min([...perWeek.values()].filter((n) => n >= 3).length, SANCTUARY.length);

  const sessionDays: string[] = settings?.session_days ?? ["Tue", "Thu", "Sat"];
  const isSessionToday = sessionDays.map((d) => DAYS.indexOf(d)).includes(todayIdx);
  const dayIndex = Math.floor(Date.now() / 86_400_000) % Math.max(active.length, 1);
  const focus = active[dayIndex] ?? active[0];
  const plan = focus
    ? (((profiles ?? []).find((p) => p.subject_key === focus.key)?.dimensions as Record<string, unknown>)?._next_focus as string | undefined)
    : undefined;

  function dueLabel(d: string) {
    const diff = Math.round((new Date(d + "T00:00:00").getTime() - new Date(now.toDateString()).getTime()) / 86_400_000);
    if (diff <= 0) return "today";
    if (diff === 1) return "tomorrow";
    if (diff < 7) return DAY_FULL[new Date(d + "T00:00:00").getDay()];
    return new Date(d + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-ink/40">{DAY_FULL[todayIdx]} {partOfDay}</p>
          <h1 className="mt-1 text-3xl leading-tight">Hi Isabella</h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-terracotta/10 px-3.5 py-2">
            <span className="text-xl">🔥</span>
            <div className="leading-none">
              <div className="font-display text-lg text-terracotta-deep">{streak}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink/50">streak</div>
            </div>
          </div>
        )}
      </div>

      {/* Hero */}
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-sage to-sage-deep text-white shadow-sm">
        <div className="flex items-stretch">
          <div className="flex shrink-0 items-end overflow-hidden pl-1 pt-4 sm:pl-3">
            <TutorCharacter size={116} full />
          </div>
          <div className="flex-1 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-white/60">{isSessionToday ? `Tonight · ${mins} min` : "Start here"}</p>
            <h2 className="mt-1 text-xl leading-snug">{focus ? focus.name : "Pick a subject"} with <PersonaName /></h2>
            <p className="mt-1 line-clamp-2 text-sm text-white/75">{plan || focus?.blurb || "One thing, together, then we stop."}</p>
            {focus && (
              <Link href={`/session?subject=${focus.key}&mode=scheduled`} className="mt-4 inline-block rounded-full bg-terracotta px-6 py-2.5 font-semibold text-white shadow hover:bg-terracotta-deep">
                {isSessionToday ? "Join session" : "Start a session"}
              </Link>
            )}
          </div>
        </div>
        <Link href={focus ? `/session?subject=${focus.key}&mode=adhoc` : "/subjects"} className="block border-t border-white/10 bg-black/10 py-2.5 text-center text-xs text-white/70 hover:bg-black/20">
          Not feeling it? Do ten minutes instead — that still counts.
        </Link>
      </div>

      {/* Coming up */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/40">Coming up</h3>
          <Link href="/calendar" className="text-xs font-semibold text-sage hover:underline">See calendar →</Link>
        </div>
        {(due ?? []).length === 0 ? (
          <div className="rounded-2xl border border-sand bg-paper p-5 text-sm text-ink/55">
            Nothing due right now. Your Canvas assessments show up here automatically.
          </div>
        ) : (
          <div className="space-y-2.5">
            {(due ?? []).map((a, i) => {
              const meta = a.subject_key ? SUBJECT_META[a.subject_key] : null;
              const bits: string[] = (a.next_step ?? "").split(" · ");
              const type = bits[0] && /assignment|exam|test|practical|project/i.test(bits[0]) ? bits[0] : null;
              const weight = bits.find((b: string) => /%/.test(b)) ?? null;
              const isExam = /exam|test|examination/i.test(`${a.title} ${a.next_step ?? ""}`);
              return (
                <Link key={i} href={a.subject_key ? `/session?subject=${a.subject_key}&mode=adhoc` : "/calendar"}
                  className="flex items-center gap-3 rounded-2xl border border-sand bg-paper p-3.5 hover:border-sage">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${isExam ? "bg-terracotta/15" : "bg-sage/10"}`}>
                    {meta?.emoji ?? "📌"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{meta?.name ?? "School"}</span>
                      {isExam && <span className="rounded-full bg-terracotta px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">Exam</span>}
                      {weight && <span className="rounded-full bg-sand px-1.5 py-0.5 text-[9px] text-ink/60">{weight.replace(/weighting/i, "").trim()}</span>}
                    </div>
                    <div className="truncate text-xs text-ink/55">{type ? `${type} · ` : ""}{a.title.replace(/^2026\s*/, "").replace(/\s*-\s*Notification.*$/i, "")}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-semibold text-terracotta-deep">{a.due_date ? dueLabel(a.due_date) : ""}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Your corner */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/40">Your corner</h3>
        <Link href="/me" className="block rounded-2xl border border-sand bg-gradient-to-b from-sage/10 to-paper p-5 hover:border-sage">
          <div className="flex items-center justify-between">
            <div className="flex gap-3 text-center">
              <div><div className="font-display text-xl text-sage">{streak}</div><div className="text-[10px] uppercase tracking-wide text-ink/45">streak</div></div>
              <div><div className="font-display text-xl text-sage">{thisWeek}</div><div className="text-[10px] uppercase tracking-wide text-ink/45">this week</div></div>
              <div><div className="font-display text-xl text-sage">{unlocked}</div><div className="text-[10px] uppercase tracking-wide text-ink/45">friends</div></div>
            </div>
            <div className="flex gap-0.5">
              {SANCTUARY.slice(0, 6).map((s, i) => (
                <div key={s.animal} className={i < unlocked ? "" : "opacity-20 grayscale"}>
                  <TutorCharacter size={30} look={{ animal: s.animal, color: s.color }} />
                </div>
              ))}
            </div>
          </div>
        </Link>
      </section>

      {/* Quick tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
