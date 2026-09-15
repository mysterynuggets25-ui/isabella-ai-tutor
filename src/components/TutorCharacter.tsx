"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PERSONA, getPersona, type Persona } from "@/lib/persona";

// Mia — a warm 2D tutor on a headset. She blinks, idles, and her mouth moves
// while speaking. Her look (skin, hair colour, hairstyle) comes from Isabella's
// saved choices; pass an explicit `look` to preview a look without saving.
export default function TutorCharacter({
  speaking = false,
  thinking = false,
  size = 128,
  look,
}: {
  speaking?: boolean;
  thinking?: boolean;
  size?: number;
  look?: Pick<Persona, "skin" | "hair" | "hairStyle">;
}) {
  const [resolved, setResolved] = useState<Pick<Persona, "skin" | "hair" | "hairStyle">>(
    look ?? DEFAULT_PERSONA,
  );
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);

  // If no explicit look was passed, read Isabella's saved persona on the client.
  useEffect(() => {
    if (look) {
      setResolved(look);
      return;
    }
    const p = getPersona();
    setResolved({ skin: p.skin, hair: p.hair, hairStyle: p.hairStyle });
  }, [look]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 120);
        loop();
      }, 2500 + Math.random() * 3000);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!speaking) {
      setMouthOpen(0);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const v = 0.5 + 0.4 * Math.sin(t * 21) + 0.2 * Math.sin(t * 9.1);
      setMouthOpen(Math.max(0.05, Math.min(1, v)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speaking]);

  const { skin, hair, hairStyle } = resolved;
  const eyeRy = blink ? 0.8 : 6.5;
  const mouthH = 3 + mouthOpen * 16;
  const mouthW = 26 - mouthOpen * 5;

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Your tutor">
      {/* shoulders / top (clothing) */}
      <path d="M40 200c0-30 27-46 60-46s60 16 60 46z" fill="#e08a6d" />
      <path d="M74 150c0 14 12 22 26 22s26-8 26-22v-16H74z" fill={skin} />

      {/* long hair behind (long style only) */}
      {hairStyle === "long" && (
        <path d="M46 108c0-40 22-66 54-66s54 26 54 66c0 26-6 44-12 58-6-30-8-58-8-58s-16 12-34 12-34-12-34-12 -2 28-8 58c-6-14-12-32-12-58z" fill={hair} />
      )}

      {/* face */}
      <ellipse cx="100" cy="104" rx="42" ry="46" fill={skin} />

      {/* crown / cap of hair (all styles) */}
      {hairStyle === "short" ? (
        <path d="M56 108c0-42 22-64 44-64s44 22 44 64c-4-14-10-22-14-26 2 10 0 18 0 18-8-8-18-12-30-12s-22 4-30 12c0 0-2-8 0-18-4 4-10 12-14 26z" fill={hair} />
      ) : (
        <path d="M58 96c2-34 22-52 42-52s40 18 42 52c-10-16-24-22-42-22s-32 6-42 22z" fill={hair} />
      )}
      {/* bun on top */}
      {hairStyle === "bun" && <circle cx="100" cy="40" r="15" fill={hair} />}

      {/* cheeks */}
      <circle cx="76" cy="116" r="7" fill="#f0a085" opacity="0.5" />
      <circle cx="124" cy="116" r="7" fill="#f0a085" opacity="0.5" />
      {/* brows */}
      <rect x="70" y={thinking ? 82 : 86} width="20" height="3.5" rx="1.75" fill={hair} />
      <rect x="110" y={thinking ? 82 : 86} width="20" height="3.5" rx="1.75" fill={hair} />
      {/* eyes */}
      <ellipse cx="80" cy="100" rx="6" ry={eyeRy} fill="#3a2a22" />
      <ellipse cx="120" cy="100" rx="6" ry={eyeRy} fill="#3a2a22" />
      {!blink && (
        <>
          <circle cx="82" cy="98" r="1.8" fill="#fff" />
          <circle cx="122" cy="98" r="1.8" fill="#fff" />
        </>
      )}
      {/* mouth: soft smile that opens when talking */}
      {mouthOpen < 0.15 ? (
        <path d="M88 128q12 10 24 0" fill="none" stroke="#7a3b32" strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <rect x={100 - mouthW / 2} y={128 - mouthH / 2} width={mouthW} height={mouthH} rx={mouthH / 2} fill="#7a3b32" />
      )}

      {/* headset — signals "on a call" */}
      <path d="M56 104a44 44 0 0 1 88 0" fill="none" stroke="var(--color-teal-deep)" strokeWidth="7" strokeLinecap="round" />
      <rect x="49" y="100" width="14" height="22" rx="6" fill="var(--color-teal-deep)" />
      <rect x="137" y="100" width="14" height="22" rx="6" fill="var(--color-teal-deep)" />
      <path d="M56 118q-8 18 22 22" fill="none" stroke="var(--color-teal-deep)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="80" cy="140" r="4.5" fill={speaking ? "var(--color-coral)" : "var(--color-teal)"} />
    </svg>
  );
}
