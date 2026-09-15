"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Marks a safety flag as seen/handled so it stops counting as "needs attention".
export default function AckFlagButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function ack() {
    setBusy(true);
    await createClient().from("safety_flags").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
    router.refresh();
  }

  return (
    <button
      onClick={ack}
      disabled={busy}
      className="rounded-full border border-sand px-3 py-1 text-xs font-semibold text-ink/70 hover:border-teal disabled:opacity-50"
    >
      {busy ? "…" : "Mark seen"}
    </button>
  );
}
