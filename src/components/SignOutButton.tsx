"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Sign out of either surface. On a shared family device this is essential —
// it lets Sarah and Isabella swap without an incognito window.
export default function SignOutButton({
  className = "",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className={className || "text-sm text-ink/50 hover:text-teal disabled:opacity-50"}
    >
      {busy ? "…" : label}
    </button>
  );
}
