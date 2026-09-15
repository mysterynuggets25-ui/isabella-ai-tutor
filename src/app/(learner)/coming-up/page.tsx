import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PersonaName from "@/components/PersonaName";

// Coming up — everything due soon, in order, each with the next step already
// worked out. Only three on screen at once so it reads as manageable, not a pile.
export default async function ComingUpPage() {
  const supabase = await createClient();
  const { data: due } = await supabase
    .from("assessments")
    .select("*, subjects(name)")
    .eq("done", false)
    .order("due_date", { ascending: true });

  const items = due ?? [];
  const shown = items.slice(0, 3);
  const rest = items.length - shown.length;

  function daysAway(d: string | null) {
    if (!d) return null;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
    if (diff <= 0) return "today";
    if (diff === 1) return "tomorrow";
    return `in ${diff} days`;
  }

  return (
    <div>
      <h1 className="text-3xl">Coming up</h1>
      <p className="mt-2 text-sm text-ink/55">The next few things due. One step at a time.</p>

      {shown.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-sand bg-paper p-6 text-ink/55">
          Nothing due that I know about. When Mum adds an assessment, it shows up here with a first
          step already worked out.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {shown.map((a) => (
            <div key={a.id} className="rounded-3xl border border-sand bg-paper p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] text-terracotta">
                    {a.subjects?.name ?? "School"}{a.due_date ? ` · due ${daysAway(a.due_date)}` : ""}
                  </div>
                  <h2 className="mt-1 text-xl">{a.title}</h2>
                </div>
              </div>
              {a.next_step && (
                <p className="mt-3 rounded-xl bg-sand/50 p-3 text-sm text-ink/70">
                  <span className="font-semibold">Next step:</span> {a.next_step}
                </p>
              )}
              {a.subject_key && (
                <Link
                  href={`/session?subject=${a.subject_key}&mode=adhoc`}
                  className="mt-4 inline-block rounded-full bg-terracotta px-5 py-2 text-sm font-semibold text-white hover:bg-terracotta-deep"
                >
                  Work on it with <PersonaName />
                </Link>
              )}
            </div>
          ))}
          {rest > 0 && (
            <p className="text-center text-sm text-ink/45">
              {rest} more after these. They&apos;ll move up as you finish the ones above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
