"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Voice INPUT using the browser's Web Speech API (SpeechRecognition). Free, and
// works on desktop Chrome/Edge. Not supported on Safari/iOS — there `supported`
// is false and the UI falls back to typing / the keyboard mic.
//
// Tap to start listening; on a final result we hand back the transcript.
type SRAlt = { transcript: string };
type SREvent = { results: ArrayLike<ArrayLike<SRAlt>> };
type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

export function useSpeechInput(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SR }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.lang = "en-AU";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const results = e.results;
      const last = results[results.length - 1];
      const text = last?.[0]?.transcript ?? "";
      if (text.trim()) finalRef.current(text.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
  }, []);

  const start = useCallback(() => {
    if (!recRef.current || listening) return;
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
}
