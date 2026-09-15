"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TutorCharacter from "@/components/TutorCharacter";
import { useTutorVoice } from "@/lib/tutor/useTutorVoice";
import { DEFAULT_PERSONA, getPersona, type Persona } from "@/lib/persona";

type Msg = { role: "learner" | "tutor"; content: string };

// The live session as a "video call" (Phase 2): a join lobby, Isabella's chosen
// tutor on a headset, voice out, and the timed session arc.
export default function SessionChat({
  subjectKey,
  subjectName,
  mode,
  sessionLengthMin = 30,
  voiceSpeed = 1,
}: {
  subjectKey: string;
  subjectName: string;
  mode: "scheduled" | "adhoc";
  sessionLengthMin?: number;
  voiceSpeed?: number;
}) {
  const router = useRouter();
  const voice = useTutorVoice({ rate: voiceSpeed });
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPersona(getPersona()), []);
  const name = persona.name || "Mia";

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Best-effort: if she leaves without pressing End, still close + summarise.
  useEffect(() => {
    const onHide = () => {
      if (sessionId && !ending) {
        navigator.sendBeacon?.(
          "/api/session",
          new Blob([JSON.stringify({ action: "end", sessionId })], { type: "application/json" }),
        );
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [sessionId, ending]);

  const totalSec = sessionLengthMin * 60;
  const elapsedSec = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const clock =
    mode === "scheduled"
      ? `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, "0")}`
      : `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, "0")}`;
  const arcStage =
    !startedAt ? "" :
    elapsedSec < totalSec * 0.1 ? "Settling in" :
    elapsedSec < totalSec * 0.75 ? "Working through it" :
    elapsedSec < totalSec * 0.9 ? "Your turn to explain" :
    "Wrapping up";

  const look = { skin: persona.skin, hair: persona.hair, hairStyle: persona.hairStyle };

  function join() {
    setJoined(true);
    setStartedAt(Date.now());
    const greeting = `Hi Isabella, I'm ${name}. What are we working on in ${subjectName} today?`;
    setMessages([{ role: "tutor", content: greeting }]);
    voice.prime();
    if (voiceOn) voice.speak(greeting);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    voice.prime();
    setInput("");
    setMessages((m) => [...m, { role: "learner", content: text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectKey, mode, message: text, sessionId, tutorName: name }),
      });
      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
      const reply = data.reply ?? "Sorry, I had trouble there. Try again?";
      setMessages((m) => [...m, { role: "tutor", content: reply }]);
      if (voiceOn) voice.speak(reply);
    } catch {
      setMessages((m) => [...m, { role: "tutor", content: "I lost connection for a second. Try that again?" }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      );
    }
  }

  function toggleVoice() {
    if (voiceOn) voice.cancel();
    setVoiceOn((v) => !v);
  }

  async function endSession() {
    voice.cancel();
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

  // ---- Join lobby -----------------------------------------------------------
  if (!joined) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-teal-deep to-[#06201d] px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center text-white">
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">
          {mode === "scheduled" ? "Scheduled session" : "Quick help"}
        </div>
        <div className="mt-8 rounded-[2rem] bg-white/5 p-6 ring-1 ring-white/10">
          <TutorCharacter size={150} look={look} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">{subjectName} with {name}</h1>
        <p className="mt-2 text-white/60">
          {mode === "scheduled" ? `${sessionLengthMin} minutes · one thing at a time` : "Bring your question"}
        </p>
        <button
          onClick={join}
          className="mt-8 w-full max-w-xs rounded-full bg-coral py-4 text-lg font-semibold text-white shadow-lg hover:bg-coral-deep"
        >
          Join session
        </button>
        <button onClick={() => router.push("/")} className="mt-4 text-sm text-white/50 hover:text-white">
          Not now
        </button>
      </div>
    );
  }

  // ---- Live call ------------------------------------------------------------
  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-teal-deep to-[#06201d] text-white">
      <div className="flex items-center justify-between px-5 pb-3 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-coral/90 px-2.5 py-1 text-xs font-semibold">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
          </span>
          <span className="text-sm text-white/70">{subjectName}</span>
        </div>
        <div className="text-right">
          <div className={`font-mono text-lg ${mode === "scheduled" && remainingSec <= 300 ? "text-coral" : "text-white"}`}>
            {clock}
          </div>
          {arcStage && <div className="text-[10px] uppercase tracking-wide text-white/40">{arcStage}</div>}
        </div>
      </div>

      <div className="flex flex-col items-center px-5">
        <div
          className={`rounded-[2rem] bg-white/5 p-4 ring-2 transition-all ${
            voice.speaking ? "ring-coral shadow-[0_0_40px_-8px_var(--color-coral)]" : "ring-white/10"
          }`}
        >
          <TutorCharacter speaking={voiceOn && voice.speaking} thinking={busy} size={128} look={look} />
        </div>
        <div className="mt-2 text-sm font-medium">{name}</div>
        <div className="text-xs text-white/40">{busy ? "thinking…" : voice.speaking ? "speaking…" : "your tutor"}</div>
      </div>

      <div ref={scrollRef} className="mt-3 flex-1 space-y-2.5 overflow-y-auto px-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "learner"
                ? "ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-coral px-4 py-2 text-white"
                : "mr-auto max-w-[82%] rounded-2xl rounded-bl-md bg-white/12 px-4 py-2 text-white backdrop-blur"
            }
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="mr-auto max-w-[60%] rounded-2xl bg-white/10 px-4 py-2 text-white/50">
            {name} is thinking…
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-black/20 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message ${name}`}
            className="flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-coral"
          />
          <button
            onClick={send}
            disabled={busy}
            className="rounded-full bg-coral px-5 py-3 font-semibold text-white hover:bg-coral-deep disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4">
          {voice.supported && (
            <button
              onClick={toggleVoice}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-lg ${
                voiceOn ? "bg-white/15" : "bg-white/5 text-white/40"
              }`}
              aria-label={voiceOn ? "Mute" : "Unmute"}
            >
              {voiceOn ? "🔊" : "🔇"}
            </button>
          )}
          <button
            onClick={endSession}
            disabled={ending}
            className="flex h-11 items-center gap-2 rounded-full bg-coral px-5 font-semibold text-white hover:bg-coral-deep disabled:opacity-60"
          >
            {ending ? "Saving…" : "End session"}
          </button>
        </div>
      </div>
    </div>
  );
}
