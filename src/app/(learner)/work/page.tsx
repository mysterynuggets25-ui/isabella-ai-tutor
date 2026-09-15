"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PersonaName from "@/components/PersonaName";

type Subject = { key: string; name: string };
type Result = { working: string; fixes: string[] };

// Bring your work in — she uploads a photo or pastes what she wrote, and gets
// back what's working, exactly two things to fix, and a way to talk each one
// through. No rewrite button, and the screen says so.
export default function MyWorkPage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectKey, setSubjectKey] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("subjects").select("key,name").eq("active", true).order("sort_order").then(({ data }) => {
      setSubjects(data ?? []);
      if (data?.length) setSubjectKey(data[0].key);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Downscale before upload so big phone photos don't exceed the request limit.
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return setImage(reader.result as string);
        ctx.drawImage(img, 0, 0, w, h);
        setImage(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => setImage(reader.result as string);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (busy || (!text.trim() && !image)) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectKey, text: text.trim() || undefined, imageDataUrl: image || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setResult(data);
    } catch {
      setError("Lost connection. Try again?");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setText("");
    setImage(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <h1 className="text-3xl">My work</h1>
      <p className="mt-2 text-sm text-ink/55">
        Show <PersonaName />{" "}what you&apos;ve already done. You&apos;ll get what&apos;s working and two things to fix.
      </p>

      {!result && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold">Subject</label>
            <select
              value={subjectKey}
              onChange={(e) => setSubjectKey(e.target.value)}
              className="mt-2 w-full rounded-xl border border-sand bg-paper px-4 py-3"
            >
              {subjects.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </div>

          <div className="rounded-2xl border border-dashed border-sand bg-paper p-5 text-center">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Your work" className="mx-auto max-h-56 rounded-lg" />
            ) : (
              <p className="text-sm text-ink/50">Take a photo of your work, or upload one.</p>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-3 rounded-full border border-sage px-5 py-2 text-sm font-semibold text-sage hover:bg-sage hover:text-white"
            >
              {image ? "Choose a different photo" : "📷 Add a photo"}
            </button>
          </div>

          <div className="text-center text-xs uppercase tracking-wide text-ink/40">or paste it</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your essay, answer or working here…"
            rows={5}
            className="w-full rounded-2xl border border-sand bg-paper px-4 py-3 outline-none focus:border-sage"
          />

          {error && <p className="text-sm text-terracotta-deep">{error}</p>}

          <button
            onClick={submit}
            disabled={busy || (!text.trim() && !image)}
            className="w-full rounded-full bg-terracotta py-3 text-lg font-semibold text-white hover:bg-terracotta-deep disabled:opacity-50"
          >
            {busy ? "Reading it…" : "Get feedback"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-sage/40 bg-sage/10 p-5">
            <div className="text-xs uppercase tracking-wide text-sage">What&apos;s working</div>
            <p className="mt-2 text-sm text-ink/80">{result.working}</p>
          </div>

          <div className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-5">
            <div className="text-xs uppercase tracking-wide text-terracotta-deep">Two things to fix</div>
            <ol className="mt-2 space-y-3">
              {result.fixes.map((f, i) => (
                <li key={i} className="text-sm text-ink/80">
                  <span className="font-semibold">{i + 1}.</span> {f}
                  <Link
                    href={`/session?subject=${subjectKey}&mode=adhoc`}
                    className="ml-2 inline-block rounded-full bg-terracotta px-3 py-1 text-xs font-semibold text-white hover:bg-terracotta-deep"
                  >
                    Talk it through
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <p className="text-center text-xs text-ink/45">
            There&apos;s no &quot;rewrite it for me&quot; button, and that&apos;s on purpose. <PersonaName /> will
            sit with you while you fix it yourself, so it stays your work.
          </p>

          <button onClick={reset} className="w-full rounded-full border border-sand py-3 font-semibold text-ink/70 hover:border-sage">
            Bring in something else
          </button>
        </div>
      )}
    </div>
  );
}
