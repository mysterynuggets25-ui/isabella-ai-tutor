"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Voice out using the browser's built-in speech synthesis. Free, no API key,
// works on iPhone Safari. Hardened against the common desktop quirks:
//   - Chrome pauses synthesis after ~15s / on blur -> a resume() keep-alive.
//   - First utterance can be silent until voices load -> we re-pick on
//     voiceschanged and prefer an on-device (localService) voice.
export function useTutorVoice(opts?: { rate?: number; gender?: "female" | "male" }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const keepAlive = useRef<ReturnType<typeof setInterval> | null>(null);
  const gender = opts?.gender ?? "female";

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    const female = /female|karen|catherine|zira|samantha|fiona|tessa|moira|serena/i;
    const male = /male|daniel|alex|fred|lee|oliver|gordon|rishi|arthur/i;
    const wanted = gender === "male" ? male : female;

    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const en = voices.filter((v) => /^en/i.test(v.lang));
      const local = en.filter((v) => v.localService);
      const pool = local.length ? local : en.length ? en : voices;
      voiceRef.current =
        pool.find((v) => /en-AU/i.test(v.lang) && wanted.test(v.name)) ||
        pool.find((v) => wanted.test(v.name)) ||
        pool.find((v) => /en-AU/i.test(v.lang)) ||
        pool[0] ||
        null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [gender]);

  const stopKeepAlive = () => {
    if (keepAlive.current) clearInterval(keepAlive.current);
    keepAlive.current = null;
  };

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    stopKeepAlive();
    setSpeaking(false);
  }, []);

  const primed = useRef(false);
  const prime = useCallback(() => {
    if (primed.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // Unlock speech inside a user gesture (iOS Safari requirement).
    window.speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
    primed.current = true;
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      synth.resume();
      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = opts?.rate ?? 1;
      u.pitch = 1.05;
      u.volume = 1;
      u.onstart = () => {
        setSpeaking(true);
        stopKeepAlive();
        // Chrome stops speaking after ~15s unless nudged.
        keepAlive.current = setInterval(() => synth.resume(), 5000);
      };
      u.onend = () => {
        setSpeaking(false);
        stopKeepAlive();
      };
      u.onerror = () => {
        setSpeaking(false);
        stopKeepAlive();
      };
      synth.speak(u);
    },
    [opts?.rate],
  );

  useEffect(() => () => stopKeepAlive(), []);

  return { supported, speaking, speak, cancel, prime };
}
