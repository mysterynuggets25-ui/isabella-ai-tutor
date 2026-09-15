"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Subject = { key: string; name: string };
type Sheet = { title: string; facts: string[]; why: string; keepMissing: string; phrasing: string[] };

const STYLES = {
  warm: { name: "Warm", card: "bg-[#fbf3e6] border-terracotta/30", accent: "text-terracotta-deep", font: "" },
  notebook: { name: "Notebook", card: "bg-white border-sage/40 bg-[linear-gradient(transparent_31px,#e4dccb_31px)] bg-[size:100%_32px]", accent: "text-sage-deep", font: "" },
  minimal: { name: "Minimal", card: "bg-white border-sand", accent: "text-ink", font: "" },
} as const;

// Cheat sheets — one printable page per topic, made from her own history. Hers
// to style; the creative outlet that doubles as revision.
export default function CheatSheetsPage() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectKey, setSubjectKey] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [style, setStyle] = useState<keyof typeof STYLES>("warm");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("subjects").select("key,name").eq("active", true).order("sort_order").then(({ data }) => {
      setSubjects(data ?? []);
      if (data?.length) setSubjectKey(data[0].key);
    });
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
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setSheet(data);
    } catch {
      setError("Lost connection. Try again?");
    } finally {
      setBusy(false);
    }
  }

  const s = STYLES[style];

  return (
    <div>
      <div className="print:hidden">
        <h1 className="text-3xl">Cheat sheets</h1>
        <p className="mt-2 text-sm text-ink/55">One page per topic, made from what you&apos;ve actually been working on. Yours to style, and print.</p>

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

        {sheet && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink/50">Make it yours:</span>
            {(Object.keys(STYLES) as (keyof typeof STYLES)[]).map((k) => (
              <button key={k} onClick={() => setStyle(k)} className={`rounded-full border px-4 py-1.5 text-sm ${style === k ? "border-sage bg-sage text-white" : "border-sand text-ink/70"}`}>
                {STYLES[k].name}
              </button>
            ))}
            <button onClick={() => window.print()} className="ml-auto rounded-full bg-sage px-5 py-1.5 text-sm font-semibold text-white">
              🖨️ Save as PDF / Print
            </button>
          </div>
        )}
      </div>

      {sheet && (
        <div className={`mt-6 rounded-2xl border p-6 ${s.card}`} id="cheatsheet">
          <h2 className={`font-display text-2xl ${s.accent}`}>{sheet.title}</h2>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">The facts</div>
            <ul className="mt-2 space-y-1 text-sm text-ink/85">
              {sheet.facts.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          </div>
          {sheet.why && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">Why it works</div>
              <p className="mt-1 text-sm text-ink/85">{sheet.why}</p>
            </div>
          )}
          {sheet.keepMissing && (
            <div className={`mt-4 rounded-xl border-l-4 border-terracotta bg-terracotta/5 p-3`}>
              <div className="text-xs font-semibold uppercase tracking-wide text-terracotta-deep">The one you keep missing</div>
              <p className="mt-1 text-sm text-ink/85">{sheet.keepMissing}</p>
            </div>
          )}
          {sheet.phrasing.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">Exam wording</div>
              <p className="mt-1 text-sm text-ink/85">{sheet.phrasing.join(" · ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
