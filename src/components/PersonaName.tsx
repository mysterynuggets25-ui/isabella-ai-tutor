"use client";

import { useEffect, useState } from "react";
import { getPersona } from "@/lib/persona";

// Renders Isabella's chosen tutor name (from her device). Falls back to "Mia"
// on the server and until localStorage is read.
export default function PersonaName({ fallback = "Mia" }: { fallback?: string }) {
  const [name, setName] = useState(fallback);
  useEffect(() => setName(getPersona().name || fallback), [fallback]);
  return <>{name}</>;
}
