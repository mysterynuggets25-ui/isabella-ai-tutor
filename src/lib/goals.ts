"use client";

// Isabella's own goals. Personal and low-stakes, stored on her device. Goals
// are hers to set and tick — not assigned, not graded.
export type Goal = { id: string; text: string; done: boolean };

const KEY = "isabella.goals";

export function getGoals(): Goal[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveGoals(goals: Goal[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(goals));
  } catch {
    // storage blocked — non-fatal
  }
}
