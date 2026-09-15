import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TutorCharacter from "@/components/TutorCharacter";
import Goals from "@/components/Goals";
import SignOutButton from "@/components/SignOutButton";
import type { Animal } from "@/lib/persona";
import { computeStreak } from "@/lib/streak";

// My corner — a quiet, private place that rewards showing up. One animal joins
// the sanctuary each week she completes. No scores, no leaderboards.
const SANCTUARY: { animal: Animal; color: string; name: string }[] = [
  { animal: "pig", color: "#e8a0a0", name: "Penny" },
  { animal: "rabbit", color: "#d9a05f", name: "Clover" },
  { animal: "cat", color: "#8a8f7a", name: "Sage" },
  { animal: "fox", color: "#c1673f", name: "Rusty" },
  { animal: "owl", color: "#6e7d58", name: "Ollie" },
  { animal: "bear", color: "#7a6a5a", name: "Bramble" },
];

const MONDAY_EPOCH = Date.UTC(2020, 0, 6); // a Monday

export default async function MyCornerPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase.from("sessions").select("started_at").limit(2000);

  const all = sessions ?? [];
  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = all.filter((s) => new Date(s.started_at).getTime() >= weekAgo).length;

  // Count "completed weeks" = weeks with 3+ sessions.
  const perWeek = new Map<number, number>();
  for (const s of all) {
    const wk = Math.floor((new Date(s.started_at).getTime() - MONDAY_EPOCH) / (7 * 86_400_000));
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  }
  const completedWeeks = [...perWeek.values()].filter((n) => n >= 3).length;
  const unlocked = Math.min(completedWeeks, SANCTUARY.length);
  const { current: streak } = computeStreak(all.map((s) => new Date(s.started_at)));

  return (
    <div>
      <h1 className="text-3xl">My corner</h1>
      <p className="mt-2 text-sm text-ink/55">Yours. A new friend joins each week you show up.</p>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <Stat value={streak} label="🔥 day streak" />
        <Stat value={thisWeek} label="this week" />
        <Stat value={all.length} label="sessions" />
      </div>

      {/* Sanctuary */}
      <div className="mt-6 rounded-3xl border border-sand bg-gradient-to-b from-sage/15 to-paper p-5">
        <h2 className="text-lg">Your sanctuary</h2>
        <p className="mt-1 text-xs text-ink/55">
          {unlocked === 0
            ? "Finish a week of sessions and your first friend arrives."
            : `${unlocked} ${unlocked === 1 ? "friend has" : "friends have"} joined you.`}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-6">
          {SANCTUARY.map((a, i) => {
            const on = i < unlocked;
            return (
              <div key={a.animal} className="flex flex-col items-center">
                <div className={on ? "" : "opacity-20 grayscale"}>
                  <TutorCharacter size={56} look={{ animal: a.animal, color: a.color }} />
                </div>
                <div className="mt-1 text-[11px] text-ink/50">{on ? a.name : "· · ·"}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <Goals />
      </div>

      <Link
        href="/tutor"
        className="mt-6 block rounded-2xl border border-sand bg-paper p-4 text-center font-semibold text-sage hover:border-sage"
      >
        Change your tutor
      </Link>

      <div className="mt-8 text-center">
        <SignOutButton />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-paper p-3">
      <div className="font-display text-2xl text-sage">{value}</div>
      <div className="text-xs text-ink/60">{label}</div>
    </div>
  );
}
