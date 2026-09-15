"use client";

// Isabella's tutor is hers: a named animal companion she picks. Her choices
// live on her own device (localStorage) so it needs no database change and no
// parent approval. The name is passed into each tutor request so the model
// knows who it is. The animal, colour, name and voice are all Isabella's call.

export type Animal = "fox" | "cat" | "rabbit" | "bear" | "owl";

export type Persona = {
  name: string;
  animal: Animal;
  color: string;
  voice: "female" | "male";
};

export const ANIMALS: { key: Animal; label: string }[] = [
  { key: "fox", label: "Fox" },
  { key: "cat", label: "Cat" },
  { key: "rabbit", label: "Rabbit" },
  { key: "bear", label: "Bear" },
  { key: "owl", label: "Owl" },
];

// Warm, low-contrast fur colours (no neon).
export const FUR_COLORS = ["#c1673f", "#d9a05f", "#8a8f7a", "#6e7d58", "#7a6a5a", "#3b352d"];

export const DEFAULT_PERSONA: Persona = {
  name: "Hazel",
  animal: "fox",
  color: FUR_COLORS[0],
  voice: "female",
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
