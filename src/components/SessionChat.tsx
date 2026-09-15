"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TutorCharacter from "@/components/TutorCharacter";
import { useTutorVoice } from "@/lib/tutor/useTutorVoice";
import { DEFAULT_PERSONA, getPersona, type Persona } from "@/lib/persona";

type Msg = { role: "learner" | "tutor"; content: string };

// The session as a real video call — the behavioural heart of the app. Tutor on
// camera, her own self-view tile (camera OFF by default), a timer, sound and
// camera controls and a Leave button, with a shared board beside it where the
// working appears. "Type instead" is always there, so a reserved day never means
// cancelling — she just types.
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
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);
  const voice = useTutorVoice({ rate: voiceSpeed, gender: persona.voice });
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => setPersona(getPersona()), []);
  const name = persona.name || "Penny";
  const look = { animal: persona.animal, color: persona.color };

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Self-view webcam — local only, never sent anywhere, off by default.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (cameraOn) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch {
          setCameraOn(false);
        }
      } else {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [cameraOn]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  // Close + summarise even if she just closes the tab.
  useEffect(() => {
    const onHide = () => {
      if (sessionId && !ending)
        navigator.sendBeacon?.(
          "/api/session",
          new Blob([JSON.stringify({ action: "end", sessionId })], { type: "application/json" }),
        );
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

  function join() {
    setJoined(true);
    setStartedAt(Date.now());
    const greeting = `Hi Isabella, I'm ${name}. What are we working on in ${subjectName} today?`;
    setMessages([{ role: "tutor", content: greeting }]);
    voice.prime();
    if (soundOn) voice.speak(greeting);
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
      if (soundOn) voice.speak(reply);
    } catch {
      setMessages((m) => [...m, { role: "tutor", content: "I lost connection for a second. Try that again?" }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    }
  }

  function toggleSound() {
    if (soundOn) voice.cancel();
    setSoundOn((v) => !v);
  }

  async function leave() {
    voice.cancel();
    streamRef.current?.getTracks().forEach((t) => t.stop());
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
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-sage-deep to-[#2c3325] px-6 text-center text-white">
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">
          {mode === "scheduled" ? "Scheduled session" : "Quick help"}
        </div>
        <div className="mt-8 rounded-[2rem] bg-white/5 p-6 ring-1 ring-white/10">
          <TutorCharacter size={150} look={look} />
        </div>
        <h1 className="mt-6 text-2xl">{subjectName} with {name}</h1>
        <p className="mt-2 text-white/60">
          {mode === "scheduled" ? `${sessionLengthMin} minutes · one thing at a time` : "Bring your question"}
        </p>
        <p className="mt-1 text-xs text-white/40">Your camera stays off unless you turn it on.</p>
        <button onClick={join} className="mt-8 w-full max-w-xs rounded-full bg-terracotta py-4 text-lg font-semibold text-white shadow-lg hover:bg-terracotta-deep">
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
    <div className="fixed inset-0 flex flex-col bg-[#20241b] text-white md:flex-row">
      {/* CALL SIDE */}
      <div className="relative flex shrink-0 flex-col bg-gradient-to-b from-sage-deep to-[#20241b] md:w-1/2">
        <div className="flex items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="flex items-center gap-1.5 rounded-full bg-terracotta/90 px-2.5 py-1 text-xs font-semibold">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
          </span>
          <span className={`font-mono text-lg ${mode === "scheduled" && remainingSec <= 300 ? "text-terracotta" : ""}`}>{clock}</span>
        </div>

        {/* Tutor on camera */}
        <div className="flex flex-1 items-center justify-center px-6 py-4">
          <div className={`rounded-[2rem] bg-black/20 p-6 ring-2 transition-all ${voice.speaking ? "ring-terracotta shadow-[0_0_50px_-10px_var(--color-terracotta)]" : "ring-white/10"}`}>
            <TutorCharacter speaking={soundOn && voice.speaking} thinking={busy} size={150} look={look} />
          </div>
        </div>
        <div className="pb-1 text-center text-sm font-medium">{name}</div>
        <div className="pb-2 text-center text-xs text-white/40">{busy ? "thinking…" : voice.speaking ? "speaking…" : subjectName}</div>

        {/* Self-view tile */}
        <div className="absolute bottom-24 right-4 h-24 w-20 overflow-hidden rounded-xl border border-white/20 bg-black/40 md:bottom-28">
          {cameraOn ? (
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-white/50">
              <span className="text-2xl">📷</span>
              <span className="mt-1 text-[10px]">Camera off</span>
            </div>
          )}
          <div className="absolute bottom-0 w-full bg-black/40 py-0.5 text-center text-[10px]">Isabella</div>
        </div>

        {/* Call controls */}
        <div className="flex items-center justify-center gap-3 border-t border-white/10 bg-black/20 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <CallBtn onClick={toggleSound} on={soundOn} label={soundOn ? "🔊" : "🔇"} />
          <CallBtn onClick={() => setCameraOn((c) => !c)} on={cameraOn} label={cameraOn ? "📹" : "📷"} />
          <button onClick={leave} disabled={ending} className="flex h-11 items-center gap-2 rounded-full bg-terracotta px-5 font-semibold text-white hover:bg-terracotta-deep disabled:opacity-60">
            {ending ? "Saving…" : "Leave"}
          </button>
        </div>
      </div>

      {/* SHARED BOARD */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-white/10 bg-paper text-ink md:border-l md:border-t-0">
        <div className="border-b border-sand px-5 py-3">
          <div className="text-xs uppercase tracking-[0.12em] text-ink/40">Shared board</div>
          <div className="font-display text-lg">{subjectName}</div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "learner"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-sage px-4 py-2 text-white"
                  : "mr-auto max-w-[92%] rounded-2xl rounded-bl-md border border-sand bg-cream px-4 py-2"
              }
            >
              {m.content}
            </div>
          ))}
          {busy && <div className="mr-auto rounded-2xl border border-sand bg-cream px-4 py-2 text-ink/40">{name} is thinking…</div>}
        </div>

        <div className="border-t border-sand px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`Type to ${name}, or tap your keyboard mic to talk`}
              className="flex-1 rounded-full border border-sand bg-cream px-4 py-3 text-ink outline-none focus:border-sage"
            />
            <button onClick={send} disabled={busy} className="rounded-full bg-terracotta px-5 py-3 font-semibold text-white hover:bg-terracotta-deep disabled:opacity-50">
              Send
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-ink/40">These notes save on their own. Only you and Mum can see them.</p>
        </div>
      </div>
    </div>
  );
}

function CallBtn({ onClick, on, label }: { onClick: () => void; on: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-lg ${on ? "bg-white/20" : "bg-white/5 text-white/40"}`}
    >
      {label}
    </button>
  );
}
