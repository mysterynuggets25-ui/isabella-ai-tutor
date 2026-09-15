import { createClient } from "@/lib/supabase/server";

// Memory — what the tutor has learned about how Isabella works, per subject.
// This is the asset worth protecting: it grows a little after every session and
// is read before the next one, so the tutoring gets steadily more tailored.
const DIM_LABELS: Record<string, string> = {
  hint_need: "How much help she needs",
  entry_point: "Best way in",
  engages_with: "What draws her in",
  struggles_with: "What trips her up",
  pace: "Pace",
  interests: "Interests that land",
  recovery: "After a wrong answer",
  confidence: "Confidence",
};

export default async function MemoryPage() {
  const supabase = await createClient();
  const [{ data: subjects }, { data: profiles }, { data: notes }] = await Promise.all([
    supabase.from("subjects").select("key,name").order("sort_order"),
    supabase.from("learner_profile").select("*"),
    supabase.from("profile_notes").select("subject_key,note,created_at").order("created_at", { ascending: false }).limit(60),
  ]);

  const byKey = new Map((profiles ?? []).map((p) => [p.subject_key, p]));
  const notesByKey = new Map<string, { note: string; created_at: string }[]>();
  for (const n of notes ?? []) {
    notesByKey.set(n.subject_key, [...(notesByKey.get(n.subject_key) ?? []), n]);
  }

  const withMemory = (subjects ?? []).filter((s) => byKey.has(s.key) && (byKey.get(s.key)!.summary || Object.keys(byKey.get(s.key)!.dimensions ?? {}).length));

  return (
    <div>
      <h1 className="text-xl font-semibold">Memory</h1>
      <p className="mt-1 text-sm text-ink/60">
        What the tutor has learned about how Isabella works. It updates a little after each session and
        shapes the next one. This lives in your own database, not a third party.
      </p>

      {withMemory.length === 0 ? (
        <div className="mt-6 rounded-xl border border-sand p-6 text-ink/50">
          Nothing learned yet. After a few real sessions, the tutor&apos;s picture of how she works
          builds up here.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {withMemory.map((s) => {
            const p = byKey.get(s.key)!;
            const dims = (p.dimensions ?? {}) as Record<string, string>;
            const recent = (notesByKey.get(s.key) ?? []).slice(0, 4);
            return (
              <div key={s.key} className="rounded-xl border border-sand bg-paper p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold">{s.name}</h2>
                  {p.level_estimate && <span className="text-xs text-ink/50">Level: {p.level_estimate}</span>}
                </div>
                {p.summary && <p className="mt-2 text-sm text-ink/75">{p.summary}</p>}

                {Object.keys(dims).length > 0 && (
                  <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {Object.entries(dims).map(([k, v]) => (
                      <div key={k} className="text-sm">
                        <dt className="text-xs uppercase tracking-wide text-sage">{DIM_LABELS[k] ?? k.replace(/_/g, " ")}</dt>
                        <dd className="text-ink/75">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {recent.length > 0 && (
                  <div className="mt-4 border-t border-sand pt-3">
                    <div className="text-xs uppercase tracking-wide text-ink/40">Recent notes</div>
                    <ul className="mt-2 space-y-1.5">
                      {recent.map((n, i) => (
                        <li key={i} className="text-sm text-ink/60">
                          <span className="text-ink/40">{new Date(n.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}:</span> {n.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
