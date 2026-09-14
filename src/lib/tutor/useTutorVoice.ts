"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Voice out using the browser's built-in speech synthesis. Free, no API key,
// works on iPhone Safari. The neural-TTS upgrade (a paid key, nicer voice) can
// swap in behind this same interface later without touching the UI.
export function useTutorVoice(opts?: { rate?: number }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer an Australian English female-ish voice, then any en, then default.
      voiceRef.current =
        voices.find((v) => /en-AU/i.test(v.lang) && /female|karen|catherine|zira|samantha/i.test(v.name)) ||
        voices.find((v) => /en-AU/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang)) ||
        voices[0] ||
        null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const primed = useRef(false);
  // iOS Safari only allows speech that begins inside a user gesture. Call this
  // from the tap handler (e.g. Send) to unlock speech for the rest of the visit.
  const prime = useCallback(() => {
    if (primed.current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
    primed.current = true;
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = opts?.rate ?? 1;
      u.pitch = 1.05;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [opts?.rate],
  );

  return { supported, speaking, speak, cancel, prime };
}
