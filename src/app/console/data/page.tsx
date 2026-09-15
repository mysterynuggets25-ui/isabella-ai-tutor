"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Data & privacy — export everything, delete everything, and roll over to the
// next school year. Her data lives in your own database; these are the controls.
export default function DataPage() {
  const supabase = createClient();
  const [yearLevel, setYearLevel] = useState<string>("");
  const [age, setAge] = useState<number>(15);
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("year_level,age").eq("id", 1).single().then(({ data }) => {
      setYearLevel(data?.year_level ?? "Year 10");
      setAge(data?.age ?? 15);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function rollover() {
    if (!confirm(`Roll over to the next year? This sets her to Year ${Number((yearLevel.match(/\d+/) ?? [10])[0]) + 1} and age ${age + 1}. Update her subjects afterwards.`)) return;
    setBusy(true);
    const nextYear = `Year ${Number((yearLevel.match(/\d+/) ?? [10])[0]) + 1}`;
    await supabase.from("settings").update({ year_level: nextYear, age: age + 1 }).eq("id", 1);
    setYearLevel(nextYear);
    setAge(age + 1);
    setStatus(`Rolled over to ${nextYear}. Now switch her subjects over in Subjects & settings.`);
    setBusy(false);
  }

  async function wipe() {
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/console/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: confirmText }),
    });
    if (res.ok) {
      setStatus("Deleted. Her sessions, transcripts and the tutor's memory are gone.");
      setConfirmText("");
    } else {
      const d = await res.json();
      setStatus(d.error ?? "Could not delete.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Data &amp; privacy</h1>
      {status && <p className="rounded-lg bg-sand/50 p-3 text-sm text-ink/70">{status}</p>}

      {/* Export */}
      <section className="rounded-xl border border-sand p-5">
        <h2 className="font-semibold">Export her data</h2>
        <p className="mt-1 text-sm text-ink/60">Download everything (profile, transcripts, notes) as one JSON file.</p>
        <a href="/api/console/export" className="mt-3 inline-block rounded-full bg-sage px-5 py-2 text-sm font-semibold text-white hover:bg-sage-deep">
          Download export
        </a>
      </section>

      {/* Year rollover */}
      <section className="rounded-xl border border-sand p-5">
        <h2 className="font-semibold">End of year</h2>
        <p className="mt-1 text-sm text-ink/60">
          Currently {yearLevel}, age {age}. Roll over when she moves up a year, then switch her subjects
          over in Subjects &amp; settings. Her history is kept.
        </p>
        <button onClick={rollover} disabled={busy} className="mt-3 rounded-full border border-sage px-5 py-2 text-sm font-semibold text-sage hover:bg-sage hover:text-white disabled:opacity-50">
          Roll over to the next year
        </button>
      </section>

      {/* Delete */}
      <section className="rounded-xl border border-coral/40 bg-coral/5 p-5">
        <h2 className="font-semibold text-coral-deep">Delete everything</h2>
        <p className="mt-1 text-sm text-ink/70">
          Permanently deletes her sessions, transcripts and the tutor&apos;s memory of her. Her login and
          your settings stay. This cannot be undone.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="rounded-lg border border-sand px-3 py-2 text-sm"
          />
          <button
            onClick={wipe}
            disabled={busy || confirmText !== "DELETE"}
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-deep disabled:opacity-40"
          >
            Delete her data
          </button>
        </div>
      </section>
    </div>
  );
}
