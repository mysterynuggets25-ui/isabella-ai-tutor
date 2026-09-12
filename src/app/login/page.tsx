"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Shared sign-in for both surfaces. Which app you land in is decided by your
// role (parent -> console, learner -> her app), enforced server-side.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.refresh();
    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Isabella&apos;s Tutor</h1>
      <p className="mt-1 text-sm text-ink/60">Sign in to continue.</p>

      <form onSubmit={signIn} className="mt-6 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-sand bg-white px-4 py-3 outline-none focus:border-teal"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-sand bg-white px-4 py-3 outline-none focus:border-teal"
          required
        />
        {error && <p className="text-sm text-coral-deep">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-teal py-3 font-semibold text-white hover:bg-teal-deep disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
