"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TUTOR_NAME = "Mia";

type Msg = { role: "learner" | "tutor"; content: string };

// The live session. Phase 1 is text in / text out. The character here is a
// static placeholder; Phase 2 swaps in the audio-driven animated face.
export default function SessionChat({
  subjectKey,
  subjectName,
  mode,
}: {
  subjectKey: string;
  subjectName: string;
  mode: "scheduled" | "adhoc";
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "learner", content: text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectKey, mode, message: text, sessionId }),
      });
      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((m) => [
        ...m,
        { role: "tutor", content: data.reply ?? "Sorry, I had trouble there. Try again?" },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "tutor", content: "I lost connection for a second. Try that again?" },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      );
    }
  }

  async function endSession() {
    if (sessionId) {
      setEnding(true);
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", sessionId }),
      }).catch(() => {});
    }
    router.push("/");
  }

  return (
    <div className="flex min-h-[80dvh] flex-col">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink/50">
            {subjectName} · {mode === "scheduled" ? "session" : "quick help"}
          </div>
          <div className="text-lg font-semibold">{TUTOR_NAME}</div>
        </div>
        <button
          onClick={endSession}
          disabled={ending}
          className="rounded-full border border-sand px-4 py-1.5 text-sm text-ink/70 hover:border-teal disabled:opacity-50"
        >
          {ending ? "Saving..." : "End"}
        </button>
      </div>

      {/* Character placeholder (Phase 2 = animated audio-driven face) */}
      <div className="mt-4 flex justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-teal-deep text-3xl text-white">
          {TUTOR_NAME[0]}
        </div>
      </div>

      <div ref={scrollRef} className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-sand p-4 text-sm text-ink/70">
            Hi, I&apos;m {TUTOR_NAME}. Tell me what you&apos;re working on in {subjectName}, or
            paste the question you&apos;re stuck on. We&apos;ll do it together.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "learner"
                ? "ml-auto max-w-[85%] rounded-2xl bg-coral px-4 py-2 text-white"
                : "mr-auto max-w-[85%] rounded-2xl bg-white px-4 py-2 shadow-sm"
            }
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="mr-auto max-w-[60%] rounded-2xl bg-white px-4 py-2 text-ink/40 shadow-sm">
            {TUTOR_NAME} is thinking...
          </div>
        )}
      </div>

      <div className="sticky bottom-20 mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Message ${TUTOR_NAME}`}
          className="flex-1 rounded-full border border-sand bg-white px-4 py-3 outline-none focus:border-teal"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-full bg-teal px-5 py-3 font-semibold text-white hover:bg-teal-deep disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
