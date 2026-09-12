import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const TUTOR_NAME = "Mia";

// Today — one card, one action. The scheduled session for today, plus a way in
// for anything else. Never a wall of subjects or a to-do list.
export default async function TodayPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("settings").select("*").eq("id", 1).single();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("key,name")
    .eq("active", true)
    .order("sort_order");

  const today = new Date().toLocaleDateString("en-AU", { weekday: "short" });
  const isSessionDay = (settings?.session_days ?? []).includes(today);

  // Rotate the day's subject by day-of-year across active subjects.
  const active = subjects ?? [];
  const dayIndex = Math.floor(Date.now() / 86_400_000) % Math.max(active.length, 1);
  const todaySubject = active[dayIndex];

  return (
    <div>
      <p className="text-sm text-ink/60">
        {new Date().toLocaleDateString("en-AU", { weekday: "long" })}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Hey Isabella</h1>

      {isSessionDay && todaySubject ? (
        <div className="mt-6 rounded-3xl bg-teal-deep p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Tonight · {settings?.session_length_min ?? 30} min
          </p>
          <h2 className="mt-2 text-xl font-semibold">{todaySubject.name}</h2>
          <p className="mt-1 text-sm text-white/70">
            {TUTOR_NAME} has tonight planned. One thing at a time.
          </p>
          <Link
            href={`/session?subject=${todaySubject.key}&mode=scheduled`}
            className="mt-5 block rounded-full bg-coral py-3 text-center font-semibold text-white hover:bg-coral-deep"
          >
            Start with {TUTOR_NAME}
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl bg-sand p-6">
          <h2 className="text-lg font-semibold">No session scheduled today</h2>
          <p className="mt-1 text-sm text-ink/70">
            Take the night off, or ask {TUTOR_NAME} about anything you are stuck on.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-3xl border border-sand p-6">
        <h3 className="font-semibold">Something else on your mind?</h3>
        <p className="mt-1 text-sm text-ink/70">Ask about any subject, any time.</p>
        <Link
          href="/subjects"
          className="mt-4 block rounded-full border border-teal py-3 text-center font-semibold text-teal hover:bg-teal hover:text-white"
        >
          Ask {TUTOR_NAME} anything
        </Link>
      </div>
    </div>
  );
}
