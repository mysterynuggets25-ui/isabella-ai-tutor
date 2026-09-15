"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Lets Sarah generate this week's note on demand (it also runs automatically
// every Sunday evening).
export default function WeeklyNoteButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await fetch("/api/cron/weekly-note");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="rounded-full border border-sand px-4 py-1.5 text-xs font-semibold text-ink/70 hover:border-teal disabled:opacity-50"
    >
      {busy ? "Writing…" : "Write this week's note"}
    </button>
  );
}
