import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AckFlagButton from "@/components/AckFlagButton";

// Safety flags. When Isabella raises self-harm, abuse, bullying or serious
// distress, the tutor gives a safe response and the moment is surfaced here.
// This is a signal for a parent conversation, not a crisis service.
export default async function SafetyPage() {
  const supabase = await createClient();
  const { data: flags } = await supabase
    .from("safety_flags")
    .select("id,session_id,category,excerpt,created_at,acknowledged_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-xl font-semibold">Safety</h1>
      <p className="mt-1 text-sm text-ink/60">
        If Isabella is in immediate danger, call 000. Kids Helpline 1800 55 1800 · Lifeline 13 11 14.
      </p>

      <div className="mt-6 space-y-3">
        {(flags ?? []).map((f) => (
          <div
            key={f.id}
            className={`rounded-xl border p-4 ${
              f.acknowledged_at ? "border-sand" : "border-coral bg-coral/5"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium capitalize">{f.category.replace("_", " ")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink/50">{new Date(f.created_at).toLocaleString("en-AU")}</span>
                {!f.acknowledged_at && <AckFlagButton id={f.id} />}
              </div>
            </div>
            {f.excerpt && <p className="mt-2 text-sm text-ink/70">“{f.excerpt}”</p>}
            <div className="mt-2 flex items-center gap-3">
              {f.session_id && (
                <Link href={`/console/transcripts/${f.session_id}`} className="text-sm text-teal hover:underline">
                  Open the session
                </Link>
              )}
              {f.acknowledged_at && <span className="text-xs text-ink/40">Seen</span>}
            </div>
          </div>
        ))}
        {(!flags || flags.length === 0) && (
          <p className="rounded-xl border border-sand p-6 text-center text-ink/40">
            No flags. This is the state you want.
          </p>
        )}
      </div>
    </div>
  );
}
