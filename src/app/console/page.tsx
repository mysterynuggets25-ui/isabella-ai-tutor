import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import WeeklyNoteButton from "@/components/WeeklyNoteButton";

// Overview — patterns, not grades. The written note is the part Sarah reads;
// the evidence sits below it.
export default async function ConsoleOverview() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);

  const [{ data: sessions }, { data: flags }, { data: latestNote }, { data: settings }, { data: usage }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id,subject_key,mode,status,summary,started_at")
      .gte("started_at", weekAgo)
      .order("started_at", { ascending: false }),
    supabase.from("safety_flags").select("id").is("acknowledged_at", null),
    supabase.from("weekly_notes").select("body,week_start").order("week_start", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("settings").select("monthly_cap_usd").eq("id", 1).single(),
    supabase.from("usage_monthly").select("cost_usd").eq("month", month).maybeSingle(),
  ]);

  const done = (sessions ?? []).filter((s) => s.status === "ended").length;
  const openFlags = flags?.length ?? 0;
  const spent = Number(usage?.cost_usd ?? 0);
  const cap = Number(settings?.monthly_cap_usd ?? 0);

  return (
    <div>
      <h1 className="text-xl font-semibold">This week</h1>

      {openFlags > 0 && (
        <Link
          href="/console/safety"
          className="mt-4 block rounded-xl border border-coral bg-coral/10 p-4 text-sm text-coral-deep"
        >
          {openFlags} safety flag{openFlags > 1 ? "s" : ""} need your attention.
        </Link>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat value={`${done}`} label="Sessions done" />
        <Stat value={`${sessions?.length ?? 0}`} label="Sessions started" />
        <Stat value={openFlags ? `${openFlags}` : "0"} label="Flags to review" />
        <Stat value={`$${spent.toFixed(2)}`} label={cap > 0 ? `of $${cap.toFixed(0)} this month` : "spent this month"} />
      </div>

      <div className="mt-8 rounded-xl border border-sand p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">What I&apos;d do next</h2>
          <WeeklyNoteButton />
        </div>
        <p className="mt-2 text-sm text-ink/70">
          {latestNote?.body ??
            "The weekly written note appears here (it writes itself every Sunday evening, or press the button to write it now)."}
        </p>
      </div>

      <h2 className="mt-8 font-semibold">Recent sessions</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink/50">
            <tr>
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Subject</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">How it went</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(sessions ?? []).map((s) => (
              <tr key={s.id} className="border-t border-sand">
                <td className="py-2 pr-4 whitespace-nowrap">
                  {new Date(s.started_at).toLocaleString("en-AU", {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-2 pr-4 capitalize">{s.subject_key}</td>
                <td className="py-2 pr-4 capitalize">{s.mode}</td>
                <td className="py-2 pr-4 text-ink/70">{s.summary ?? "—"}</td>
                <td className="py-2">
                  <Link href={`/console/transcripts/${s.id}`} className="text-teal hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {(!sessions || sessions.length === 0) && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink/40">
                  No sessions yet this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-sand p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
    </div>
  );
}
