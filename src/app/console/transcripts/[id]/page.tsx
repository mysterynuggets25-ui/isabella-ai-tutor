import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Full transcript of one session, plus the structured note it wrote back to
// the learner profile.
export default async function TranscriptDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: session }, { data: messages }, { data: notes }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).single(),
    supabase.from("messages").select("role,content,created_at").eq("session_id", id).order("created_at"),
    supabase.from("profile_notes").select("note,created_at").eq("session_id", id),
  ]);

  if (!session) {
    return (
      <div>
        <Link href="/console/transcripts" className="text-sm text-teal">
          ← Sessions
        </Link>
        <p className="mt-4 text-ink/50">Session not found.</p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/console/transcripts" className="text-sm text-teal">
        ← Sessions
      </Link>
      <h1 className="mt-3 text-xl font-semibold capitalize">
        {session.subject_key} · {session.mode}
      </h1>
      <p className="text-sm text-ink/60">
        {new Date(session.started_at).toLocaleString("en-AU")} · {session.status}
      </p>

      {notes && notes.length > 0 && (
        <div className="mt-4 rounded-xl border border-sand bg-cream p-4">
          <div className="text-xs uppercase tracking-wide text-ink/50">Note written to her profile</div>
          {notes.map((n, i) => (
            <p key={i} className="mt-1 text-sm text-ink/80">
              {n.note}
            </p>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {(messages ?? []).map((m, i) => (
          <div
            key={i}
            className={
              m.role === "learner"
                ? "ml-auto max-w-[80%] rounded-2xl bg-teal px-4 py-2 text-white"
                : m.role === "tutor"
                  ? "mr-auto max-w-[80%] rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-sand"
                  : "mx-auto max-w-[90%] rounded-xl bg-sand px-3 py-1 text-center text-xs text-ink/50"
            }
          >
            {m.content}
          </div>
        ))}
        {(!messages || messages.length === 0) && (
          <p className="text-ink/40">No messages recorded.</p>
        )}
      </div>
    </div>
  );
}
