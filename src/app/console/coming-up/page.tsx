"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Subject = { key: string; name: string };
type Assessment = {
  id: string;
  subject_key: string | null;
  title: string;
  due_date: string | null;
  next_step: string | null;
  done: boolean;
};

// Where Sarah adds what Isabella has due. Items appear on Isabella's "Coming up"
// and on her Home "Later this week".
export default function ConsoleComingUp() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<Assessment[]>([]);
  const [form, setForm] = useState({ subject_key: "", title: "", due_date: "", next_step: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ data: subs }, { data: rows }] = await Promise.all([
      supabase.from("subjects").select("key,name").eq("active", true).order("sort_order"),
      supabase.from("assessments").select("*").order("due_date", { ascending: true }),
    ]);
    setSubjects(subs ?? []);
    setItems((rows as Assessment[]) ?? []);
    if (subs && subs.length && !form.subject_key) setForm((f) => ({ ...f, subject_key: subs[0].key }));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.from("assessments").insert({
      subject_key: form.subject_key || null,
      title: form.title.trim(),
      due_date: form.due_date || null,
      next_step: form.next_step.trim() || null,
      source: "manual",
    });
    setForm({ subject_key: form.subject_key, title: "", due_date: "", next_step: "" });
    setSaving(false);
    load();
  }

  async function toggleDone(a: Assessment) {
    await supabase.from("assessments").update({ done: !a.done }).eq("id", a.id);
    load();
  }
  async function remove(a: Assessment) {
    await supabase.from("assessments").delete().eq("id", a.id);
    load();
  }

  async function syncCanvas() {
    setSaving(true);
    await fetch("/api/canvas/sync").catch(() => {});
    setSaving(false);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Coming up</h1>
        <button onClick={syncCanvas} disabled={saving} className="rounded-full border border-sand px-4 py-1.5 text-xs font-semibold text-ink/70 hover:border-teal disabled:opacity-50">
          {saving ? "Syncing…" : "↻ Sync from Canvas"}
        </button>
      </div>
      <p className="mt-1 text-sm text-ink/60">Assessments sync from Canvas automatically. Add anything extra here.</p>

      <form onSubmit={add} className="mt-5 grid gap-3 rounded-xl border border-sand p-4 sm:grid-cols-2">
        <select
          value={form.subject_key}
          onChange={(e) => setForm({ ...form, subject_key: e.target.value })}
          className="rounded-lg border border-sand px-3 py-2 text-sm"
        >
          {subjects.map((s) => (
            <option key={s.key} value={s.key}>{s.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          className="rounded-lg border border-sand px-3 py-2 text-sm"
        />
        <input
          placeholder="Title (e.g. English essay draft)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rounded-lg border border-sand px-3 py-2 text-sm sm:col-span-2"
        />
        <input
          placeholder="First step for her (optional)"
          value={form.next_step}
          onChange={(e) => setForm({ ...form, next_step: e.target.value })}
          className="rounded-lg border border-sand px-3 py-2 text-sm sm:col-span-2"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sage px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {items.map((a) => (
          <div key={a.id} className={`flex items-center gap-3 rounded-xl border border-sand p-3 ${a.done ? "opacity-50" : ""}`}>
            <input type="checkbox" checked={a.done} onChange={() => toggleDone(a)} className="h-4 w-4 accent-sage" />
            <div className="flex-1">
              <div className={`text-sm font-medium ${a.done ? "line-through" : ""}`}>{a.title}</div>
              <div className="text-xs text-ink/50">
                {a.subject_key ?? "—"}{a.due_date ? ` · due ${new Date(a.due_date).toLocaleDateString("en-AU")}` : ""}
              </div>
            </div>
            <button onClick={() => remove(a)} className="text-xs text-ink/40 hover:text-coral-deep">Delete</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-ink/40">Nothing added yet.</p>}
      </div>
    </div>
  );
}
