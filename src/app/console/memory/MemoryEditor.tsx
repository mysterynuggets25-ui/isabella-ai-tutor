"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Note = { id: string; note: string; created_at: string; source: string };
export type SubjectMemory = {
  key: string;
  name: string;
  level_estimate: string | null;
  summary: string | null;
  parent_guidance: string | null;
  dimensions: Record<string, string>;
  notes: Note[];
};

const DIM_LABELS: Record<string, string> = {
  hint_need: "How much help she needs",
  entry_point: "Best way in",
  engages_with: "What draws her in",
  struggles_with: "What trips her up",
  pace: "Pace",
  interests: "Interests that land",
  recovery: "After a wrong answer",
  confidence: "Confidence",
  _next_focus: "Planned next focus",
};

async function post(body: unknown) {
  const res = await fetch("/api/console/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
}

export default function MemoryEditor({ m }: { m: SubjectMemory }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(m.summary ?? "");
  const [level, setLevel] = useState(m.level_estimate ?? "");
  const [guidance, setGuidance] = useState(m.parent_guidance ?? "");
  const [dims, setDims] = useState<[string, string][]>(Object.entries(m.dimensions ?? {}));
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasMemory = m.summary || Object.keys(m.dimensions ?? {}).length > 0 || m.notes.length > 0 || m.parent_guidance;

  async function saveProfile() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      await post({
        action: "save",
        subjectKey: m.key,
        summary,
        level_estimate: level,
        parent_guidance: guidance,
        dimensions: Object.fromEntries(dims.filter(([k, v]) => k.trim() && v.trim())),
      });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await post({ action: "add_note", subjectKey: m.key, note: newNote.trim() });
      setNewNote("");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(id: string) {
    setBusy(true);
    setErr(null);
    try {
      await post({ action: "delete_note", id });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-sand bg-paper p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-semibold">{m.name}</h2>
          {!hasMemory && <span className="text-xs text-ink/40">nothing learned yet</span>}
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-sage hover:underline">
          {open ? "Done" : hasMemory ? "Edit" : "Add"}
        </button>
      </div>

      {/* Read view */}
      {!open && hasMemory && (
        <div className="mt-2">
          {m.level_estimate && <div className="text-xs text-ink/50">Level: {m.level_estimate}</div>}
          {m.summary && <p className="mt-1 text-sm text-ink/75">{m.summary}</p>}
          {m.parent_guidance && (
            <div className="mt-3 rounded-lg border-l-4 border-terracotta bg-terracotta/5 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-terracotta-deep">Your standing note to the tutor</div>
              <p className="mt-0.5 text-sm text-ink/80">{m.parent_guidance}</p>
            </div>
          )}
          {Object.keys(m.dimensions ?? {}).length > 0 && (
            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {Object.entries(m.dimensions).map(([k, v]) => (
                <div key={k} className="text-sm">
                  <dt className="text-xs uppercase tracking-wide text-sage">{DIM_LABELS[k] ?? k.replace(/_/g, " ")}</dt>
                  <dd className="text-ink/75">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {m.notes.length > 0 && (
            <div className="mt-3 border-t border-sand pt-3">
              <div className="text-xs uppercase tracking-wide text-ink/40">Recent notes</div>
              <ul className="mt-2 space-y-1.5">
                {m.notes.slice(0, 5).map((n) => (
                  <li key={n.id} className="text-sm text-ink/60">
                    {n.source === "parent" && <span className="mr-1 rounded bg-terracotta/10 px-1 text-[10px] font-semibold uppercase text-terracotta-deep">you</span>}
                    <span className="text-ink/40">{new Date(n.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}:</span> {n.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Edit view */}
      {open && (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-terracotta-deep">Standing note to the tutor</span>
            <span className="mt-0.5 block text-xs text-ink/45">Always followed. Never overwritten by sessions. Never shown to Isabella. e.g. &quot;Go gently on the exam, she&apos;s anxious&quot; or &quot;Focus on essay structure this term.&quot;</span>
            <textarea value={guidance} onChange={(e) => setGuidance(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Summary</span>
            <span className="mt-0.5 block text-xs text-ink/45">The tutor updates this after each session. Your edits are the new starting point.</span>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Working level</span>
            <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. solid, developing" className="mt-1 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm" />
          </label>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Observed patterns</span>
            <div className="mt-1 space-y-2">
              {dims.map(([k, v], i) => (
                <div key={i} className="flex gap-2">
                  <input value={k} onChange={(e) => setDims((d) => d.map((row, j) => (j === i ? [e.target.value, row[1]] : row)))} placeholder="label" className="w-1/3 rounded-lg border border-sand bg-white px-2 py-1.5 text-sm" />
                  <input value={v} onChange={(e) => setDims((d) => d.map((row, j) => (j === i ? [row[0], e.target.value] : row)))} placeholder="what you've noticed" className="flex-1 rounded-lg border border-sand bg-white px-2 py-1.5 text-sm" />
                  <button onClick={() => setDims((d) => d.filter((_, j) => j !== i))} className="px-2 text-ink/30 hover:text-terracotta-deep">✕</button>
                </div>
              ))}
              <button onClick={() => setDims((d) => [...d, ["", ""]])} className="text-xs font-semibold text-sage hover:underline">+ Add a pattern</button>
            </div>
          </div>

          {err && <p className="text-sm text-terracotta-deep">{err}</p>}
          <div className="flex items-center gap-3">
            <button onClick={saveProfile} disabled={busy} className="rounded-full bg-sage px-5 py-2 text-sm font-semibold text-white hover:bg-sage-deep disabled:opacity-50">
              {busy ? "Saving…" : "Save changes"}
            </button>
            {saved && <span className="text-xs text-sage">Saved.</span>}
          </div>

          {/* Notes */}
          <div className="border-t border-sand pt-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Notes</span>
            <ul className="mt-2 space-y-1.5">
              {m.notes.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-2 text-sm text-ink/70">
                  <span>
                    {n.source === "parent" && <span className="mr-1 rounded bg-terracotta/10 px-1 text-[10px] font-semibold uppercase text-terracotta-deep">you</span>}
                    <span className="text-ink/40">{new Date(n.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}:</span> {n.note}
                  </span>
                  <button onClick={() => deleteNote(n.id)} className="shrink-0 px-1 text-ink/30 hover:text-terracotta-deep">✕</button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Add a note for the tutor…" className="flex-1 rounded-lg border border-sand bg-white px-3 py-2 text-sm" />
              <button onClick={addNote} disabled={busy || !newNote.trim()} className="rounded-full border border-sage px-4 py-2 text-sm font-semibold text-sage hover:bg-sage hover:text-white disabled:opacity-40">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
