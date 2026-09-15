"use client";

// Isabella's tutor is hers to shape. Her chosen name + look live on her own
// device (localStorage) so it needs no database change and no parent approval.
// The name is passed into each tutor request so the model knows who it is.

export type Persona = {
  name: string;
  skin: string;
  hair: string;
  hairStyle: "long" | "short" | "bun";
};

export const SKIN_TONES = ["#f6c9a8", "#eab38a", "#c98a5e", "#8d5a3c"];
export const HAIR_COLORS = ["#4a2e24", "#1f2937", "#8a5a2b", "#c88b3a", "#9aa3ad"];
export const HAIR_STYLES: Persona["hairStyle"][] = ["long", "short", "bun"];

export const DEFAULT_PERSONA: Persona = {
  name: "Mia",
  skin: SKIN_TONES[0],
  hair: HAIR_COLORS[0],
  hairStyle: "long",
};

const KEY = "isabella.persona";

export function getPersona(): Persona {
  if (typeof window === "undefined") return DEFAULT_PERSONA;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PERSONA;
    return { ...DEFAULT_PERSONA, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PERSONA;
  }
}

export function savePersona(p: Persona) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private mode / storage blocked: the choice just won't persist. Non-fatal.
  }
}
