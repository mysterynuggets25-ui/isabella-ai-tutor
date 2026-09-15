import { createClient } from "@/lib/supabase/server";
import MemoryEditor, { type SubjectMemory, type Note } from "./MemoryEditor";

// Memory — what the tutor has learned about how Isabella works, per subject.
// It grows a little after every session (auto-managed) and is read before the
// next one. Sarah can also manage it directly here: a standing note to the
// tutor, the summary, observed patterns, and notes — alongside the auto-updates.
export default async function MemoryPage() {
  const supabase = await createClient();
  const [{ data: subjects }, { data: profiles }, { data: notes }] = await Promise.all([
    supabase.from("subjects").select("key,name").eq("active", true).order("sort_order"),
    supabase.from("learner_profile").select("*"),
    supabase.from("profile_notes").select("id,subject_key,note,source,created_at").order("created_at", { ascending: false }).limit(120),
  ]);

  const byKey = new Map((profiles ?? []).map((p) => [p.subject_key, p]));
  const notesByKey = new Map<string, Note[]>();
  for (const n of notes ?? []) {
    const list = notesByKey.get(n.subject_key) ?? [];
    list.push({ id: n.id, note: n.note, created_at: n.created_at, source: n.source ?? "tutor" });
    notesByKey.set(n.subject_key, list);
  }

  const items: SubjectMemory[] = (subjects ?? []).map((s) => {
    const p = byKey.get(s.key);
    return {
      key: s.key,
      name: s.name,
      level_estimate: p?.level_estimate ?? null,
      summary: p?.summary ?? null,
      parent_guidance: (p as { parent_guidance?: string } | undefined)?.parent_guidance ?? null,
      dimensions: (p?.dimensions ?? {}) as Record<string, string>,
      notes: notesByKey.get(s.key) ?? [],
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Memory</h1>
      <p className="mt-1 text-sm text-ink/60">
        What the tutor has learned about how Isabella works. It updates a little after each session and
        shapes the next one. You can manage it too — a standing note to the tutor, the summary, the
        patterns, and notes. This lives in your own database, not a third party.
      </p>

      <div className="mt-6 space-y-4">
        {items.map((m) => (
          <MemoryEditor key={m.key} m={m} />
        ))}
      </div>
    </div>
  );
}
