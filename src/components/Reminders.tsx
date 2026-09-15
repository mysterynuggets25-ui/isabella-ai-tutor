"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Lets Isabella turn on a gentle reminder on her session days. Web Push works on
// desktop Chrome and on iPhone only when the app is added to the home screen.
export default function Reminders() {
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setOn(!!sub);
    });
  }, []);

  async function enable() {
    setBusy(true);
    setNote(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNote("You'll need to allow notifications in your browser.");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setNote("Reminders aren't set up yet.");
        setBusy(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      if (res.ok) setOn(true);
      else setNote("Couldn't turn reminders on. Try again?");
    } catch {
      setNote("Couldn't turn reminders on here. On iPhone, add the app to your home screen first.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setOn(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="rounded-3xl border border-sand bg-paper p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Session reminders</div>
          <div className="text-xs text-ink/55">A gentle nudge on your session days.</div>
        </div>
        <button
          onClick={on ? disable : enable}
          disabled={busy}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
            on ? "border border-sand text-ink/60" : "bg-sage text-white"
          }`}
        >
          {busy ? "…" : on ? "On — turn off" : "🔔 Turn on"}
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-terracotta-deep">{note}</p>}
    </div>
  );
}
