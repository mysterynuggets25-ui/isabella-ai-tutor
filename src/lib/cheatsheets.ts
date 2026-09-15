"use client";

// Cheat sheets Isabella has made, kept on her device so she can reopen them.
export type Sheet = {
  title: string;
  coreIdea: string;
  facts: string[];
  why: string;
  answerFrame: string;
  keepMissing: string;
  phrasing: string[];
  selfTest: string[];
};
export type SavedSheet = { id: string; subjectName: string; style: string; sheet: Sheet; savedAt: string };

const KEY = "isabella.cheatsheets";

export function getSheets(): SavedSheet[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSheets(sheets: SavedSheet[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sheets.slice(0, 40)));
  } catch {
    // storage blocked — non-fatal
  }
}
