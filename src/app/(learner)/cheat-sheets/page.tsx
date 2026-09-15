"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSheets, saveSheets, type SavedSheet, type Sheet } from "@/lib/cheatsheets";

type Subject = { key: string; name: string };

const STYLES = {
  warm: { name: "Warm", card: "bg-[#fbf3e6] border-terracotta/30", accent: "text-terracotta-deep" },
  notebook: { name: "Notebook", card: "bg-white border-sage/40 bg-[linear-gradient(transparent_31px,#e4dccb_31px)] bg-[size:100%_32px]", accent: "text-sage-deep" },
  minimal: { name: "Minimal", card: "bg-white border-sand", accent: "text-ink" },
} as const;

// Cheat sheets — one high-yield page per topic, made from her own history. Hers
// to style, print, and keep (saved to her device so she can reopen them).
export default function CheatSheetsPage() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectKey, setSubjectKey] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [style, setStyle] = useState<keyof typeof STYLES>("warm");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedSheet[]>([]);

  useEffect(() => {
    supabase.from("subjects").select("key,name").eq("active", true).order("sort_order").then(({ data }) => {
      setSubjects(data ?? []);
      if (data?.length) setSubjectKey(data[0].key);
    });
    setSaved(getSheets());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    if (busy || !subjectKey) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cheatsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectKey, topic }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Something went wrong");
      setSheet(data);
      // Keep it: save to her device.
      const subjectName = subjects.find((s) => s.key === subjectKey)?.name ?? subjectKey;
      const entry: SavedSheet = { id: crypto.randomUUID(), subjectName, style, sheet: data, savedAt: new Date().toISOString() };
      const next = [entry, ...saved].slice(0, 40);
      setSaved(next);
      saveSheets(next);
    } catch {
      setError("Lost connection. Try again?");
    } finally {
      setBusy(false);
    }
  }

  function open(s: SavedSheet) {
    setSheet(s.sheet);
    setStyle((s.style as keyof typeof STYLES) in STYLES ? (s.style as keyof typeof STYLES) : "warm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function remove(id: string) {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    saveSheets(next);
  }

  const s = STYLES[style];

  return (
    <div>
      <div className="print:hidden">
        <h1 className="text-3xl">Cheat sheets</h1>
        <p className="mt-2 text-sm text-ink/55">One page per topic from what you&apos;ve been working on. Style it, print it, and it&apos;s saved here to reopen any time.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select value={subjectKey} onChange={(e) => setSubjectKey(e.target.value)} className="rounded-xl border border-sand bg-paper px-4 py-3">
            {subjects.map((sub) => <option key={sub.key} value={sub.key}>{sub.name}</option>)}
          </select>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional, e.g. ratios)" className="rounded-xl border border-sand bg-paper px-4 py-3" />
          <button onClick={generate} disabled={busy} className="rounded-xl bg-terracotta px-6 py-3 font-semibold text-white hover:bg-terracotta-deep disabled:opacity-50">
            {busy ? "Making it…" : "Make it"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-terracotta-deep">{error}</p>}

        {/* Saved sheets */}
        {saved.length > 0 && (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink/40">Your cheat sheets</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {saved.map((sv) => (
                <div key={sv.id} className="flex items-center gap-2 rounded-full border border-sand bg-paper py-1 pl-3 pr-1 text-sm">
                  <button onClick={() => open(sv)} className="font-medium hover:text-sage">{sv.sheet.title || sv.subjectName}</button>
                  <button onClick={() => remove(sv.id)} className="rounded-full px-1.5 text-ink/30 hover:text-terracotta-deep">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sheet && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink/50">Make it yours:</span>
            {(Object.keys(STYLES) as (keyof typeof STYLES)[]).map((k) => (
              <button key={k} onClick={() => setStyle(k)} className={`rounded-full border px-4 py-1.5 text-sm ${style === k ? "border-sage bg-sage text-white" : "border-sand text-ink/70"}`}>
                {STYLES[k].name}
              </button>
            ))}
            <button onClick={() => window.print()} className="ml-auto rounded-full bg-sage px-5 py-1.5 text-sm font-semibold text-white">🖨️ Save as PDF / Print</button>
          </div>
        )}
      </div>

      {sheet && (
        <div className={`mt-6 rounded-2xl border p-6 ${s.card}`} id="cheatsheet">
          <h2 className={`font-display text-2xl ${s.accent}`}>{sheet.title}</h2>
          {sheet.coreIdea && <p className="mt-2 text-sm font-medium text-ink/80">{sheet.coreIdea}</p>}

          <Section title="The facts">
            <ul className="space-y-1 text-sm text-ink/85">{sheet.facts.map((f, i) => <li key={i}>• {f}</li>)}</ul>
          </Section>
          {sheet.why && <Section title="Why it works"><p className="text-sm text-ink/85">{sheet.why}</p></Section>}
          {sheet.answerFrame && <Section title="How to answer"><p className="text-sm text-ink/85">{sheet.answerFrame}</p></Section>}
          {sheet.keepMissing && (
            <div className="mt-4 rounded-xl border-l-4 border-terracotta bg-terracotta/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-terracotta-deep">The one you keep missing</div>
              <p className="mt-1 text-sm text-ink/85">{sheet.keepMissing}</p>
            </div>
          )}
          {sheet.phrasing.length > 0 && <Section title="Exam wording"><p className="text-sm text-ink/85">{sheet.phrasing.join(" · ")}</p></Section>}
          {sheet.selfTest.length > 0 && (
            <div className="mt-4 rounded-xl border border-sage/40 bg-sage/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-sage-deep">30-second self-test</div>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-ink/85">{sheet.selfTest.map((q, i) => <li key={i}>{q}</li>)}</ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
