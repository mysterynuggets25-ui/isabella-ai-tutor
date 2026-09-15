"use client";

// Isabella's own calendar items — things she wants to remember (a friend's
// party, a reminder, her own study goal for a day). Stored on her device.
export type PersonalEvent = { id: string; title: string; date: string };

const KEY = "isabella.events";

export function getEvents(): PersonalEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveEvents(events: PersonalEvent[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    // storage blocked — non-fatal
  }
}
