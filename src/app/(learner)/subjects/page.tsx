import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Subjects — the only list she sees, and only the ones Sarah has switched on.
export default async function SubjectsPage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("key,name,blurb")
    .eq("active", true)
    .order("sort_order");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Subjects</h1>
      <p className="mt-1 text-sm text-ink/60">Tap one to start.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {(subjects ?? []).map((s) => (
          <Link
            key={s.key}
            href={`/session?subject=${s.key}&mode=adhoc`}
            className="rounded-2xl border border-sand bg-white p-4 hover:border-teal"
          >
            <div className="font-semibold">{s.name}</div>
            <div className="mt-1 text-xs text-ink/60">{s.blurb}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-sand p-4 text-sm text-ink/70">
        Stuck on homework? Start the subject and describe the question. {""}
        {"Mia"} will work through it with you, she will not just give the answer.
      </div>
    </div>
  );
}
