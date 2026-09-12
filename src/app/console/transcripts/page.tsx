import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Every session, most recent first. Full transparency: nothing is hidden from
// Sarah, and Isabella's screen says so.
export default async function TranscriptsPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id,subject_key,mode,status,summary,started_at")
    .order("started_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-xl font-semibold">Sessions</h1>
      <div className="mt-4 divide-y divide-sand rounded-xl border border-sand">
        {(sessions ?? []).map((s) => (
          <Link
            key={s.id}
            href={`/console/transcripts/${s.id}`}
            className="flex items-center justify-between p-4 hover:bg-cream"
          >
            <div>
              <div className="font-medium capitalize">
                {s.subject_key} · <span className="text-ink/60">{s.mode}</span>
              </div>
              <div className="text-sm text-ink/60">{s.summary ?? "No summary yet"}</div>
            </div>
            <div className="text-right text-xs text-ink/50">
              {new Date(s.started_at).toLocaleString("en-AU", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              <div className="capitalize">{s.status}</div>
            </div>
          </Link>
        ))}
        {(!sessions || sessions.length === 0) && (
          <p className="p-6 text-center text-ink/40">No sessions yet.</p>
        )}
      </div>
    </div>
  );
}
