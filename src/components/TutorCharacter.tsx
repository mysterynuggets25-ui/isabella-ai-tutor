"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PERSONA, getPersona, type Animal } from "@/lib/persona";

const CREAM = "#f3eee2";
const DARK = "#3b352d";

// The tutor as a warm illustrated animal Isabella picks. Blinks, idles, and its
// mouth/beak moves while speaking. Stylised on purpose — an animal companion,
// not a photoreal avatar. Pass `look` to preview without saving.
export default function TutorCharacter({
  speaking = false,
  thinking = false,
  size = 128,
  look,
  full = false,
}: {
  speaking?: boolean;
  thinking?: boolean;
  size?: number;
  look?: { animal: Animal; color: string };
  full?: boolean; // draw the body + dungarees (for the call / big previews)
}) {
  const [resolved, setResolved] = useState<{ animal: Animal; color: string }>(
    look ?? { animal: DEFAULT_PERSONA.animal, color: DEFAULT_PERSONA.color },
  );
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);

  useEffect(() => {
    if (look) return setResolved(look);
    const p = getPersona();
    setResolved({ animal: p.animal, color: p.color });
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
    if (!speaking) return setMouthOpen(0);
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const v = 0.5 + 0.4 * Math.sin(t * 20) + 0.2 * Math.sin(t * 9);
      setMouthOpen(Math.max(0.05, Math.min(1, v)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speaking]);

  const { animal, color } = resolved;
  const eyeRy = blink ? 0.8 : (animal === "owl" ? 12 : 7);
  const eyeRx = animal === "owl" ? 12 : 7;
  const open = mouthOpen;

  const OVERALL = "#5f6f52";
  const OVERALL_DK = "#4f5c3d";

  return (
    <svg
      viewBox={full ? "0 0 200 300" : "0 0 200 200"}
      width={size}
      height={full ? size * 1.5 : size}
      role="img"
      aria-label="Your tutor"
    >
      {/* Body + dungarees (behind the head) */}
      {full && (
        <g>
          {/* torso */}
          <path d="M42 300 C42 214 62 168 100 168 C138 168 158 214 158 300 Z" fill={color} />
          {/* little arms */}
          <ellipse cx="46" cy="232" rx="15" ry="26" fill={color} />
          <ellipse cx="154" cy="232" rx="15" ry="26" fill={color} />
          {/* cream shirt at the neck */}
          <path d="M76 172 Q100 192 124 172 L124 200 L76 200 Z" fill={CREAM} />
          {/* overalls bib */}
          <path d="M66 196 Q100 214 134 196 L134 300 L66 300 Z" fill={OVERALL} />
          {/* straps */}
          <path d="M78 176 L88 202 L80 206 L70 180 Z" fill={OVERALL} />
          <path d="M122 176 L112 202 L120 206 L130 180 Z" fill={OVERALL} />
          {/* buttons */}
          <circle cx="80" cy="203" r="4" fill="#c9a24a" />
          <circle cx="120" cy="203" r="4" fill="#c9a24a" />
          {/* pocket */}
          <rect x="84" y="228" width="32" height="30" rx="6" fill="none" stroke={OVERALL_DK} strokeWidth="3" />
        </g>
      )}

      {/* Ears (behind head) */}
      {animal === "pig" && (
        <>
          <path d="M64 72 L52 44 L86 62 Z" fill={color} />
          <path d="M136 72 L148 44 L114 62 Z" fill={color} />
        </>
      )}
      {animal === "fox" && (
        <>
          <path d="M58 78 L44 26 L86 60 Z" fill={color} />
          <path d="M142 78 L156 26 L114 60 Z" fill={color} />
          <path d="M62 70 L54 42 L78 60 Z" fill={CREAM} />
          <path d="M138 70 L146 42 L122 60 Z" fill={CREAM} />
        </>
      )}
      {animal === "cat" && (
        <>
          <path d="M60 74 L48 36 L88 62 Z" fill={color} />
          <path d="M140 74 L152 36 L112 62 Z" fill={color} />
          <path d="M64 68 L56 46 L80 62 Z" fill="#e8a9a0" />
          <path d="M136 68 L144 46 L120 62 Z" fill="#e8a9a0" />
        </>
      )}
      {animal === "rabbit" && (
        <>
          <ellipse cx="80" cy="42" rx="12" ry="38" fill={color} />
          <ellipse cx="120" cy="42" rx="12" ry="38" fill={color} />
          <ellipse cx="80" cy="46" rx="6" ry="28" fill="#e8a9a0" />
          <ellipse cx="120" cy="46" rx="6" ry="28" fill="#e8a9a0" />
        </>
      )}
      {animal === "bear" && (
        <>
          <circle cx="58" cy="62" r="20" fill={color} />
          <circle cx="142" cy="62" r="20" fill={color} />
          <circle cx="58" cy="62" r="10" fill={CREAM} />
          <circle cx="142" cy="62" r="10" fill={CREAM} />
        </>
      )}
      {animal === "owl" && (
        <>
          <path d="M64 66 L58 40 L84 58 Z" fill={color} />
          <path d="M136 66 L142 40 L116 58 Z" fill={color} />
        </>
      )}

      {/* Head */}
      <ellipse cx="100" cy="112" rx="56" ry="52" fill={color} />

      {/* Muzzle / face patch */}
      {animal === "fox" && (
        <path d="M100 84 C126 84 138 108 138 122 C138 150 120 168 100 168 C80 168 62 150 62 122 C62 108 74 84 100 84 Z" fill={CREAM} />
      )}
      {animal === "cat" && <ellipse cx="100" cy="128" rx="30" ry="24" fill={CREAM} />}
      {animal === "rabbit" && <ellipse cx="100" cy="126" rx="34" ry="30" fill={CREAM} />}
      {animal === "bear" && <ellipse cx="100" cy="132" rx="30" ry="24" fill={CREAM} />}
      {animal === "owl" && (
        <>
          <ellipse cx="80" cy="104" rx="26" ry="28" fill={CREAM} />
          <ellipse cx="120" cy="104" rx="26" ry="28" fill={CREAM} />
        </>
      )}

      {/* Brows (thinking) */}
      {thinking && animal !== "owl" && (
        <>
          <rect x="72" y="92" width="18" height="3.5" rx="1.75" fill={DARK} transform="rotate(-8 81 93)" />
          <rect x="110" y="92" width="18" height="3.5" rx="1.75" fill={DARK} transform="rotate(8 119 93)" />
        </>
      )}

      {/* Eyes */}
      {animal === "owl" ? (
        <>
          <circle cx="80" cy="104" r="14" fill={DARK} />
          <circle cx="120" cy="104" r="14" fill={DARK} />
          {!blink && <><circle cx="84" cy="100" r="4" fill="#fff" /><circle cx="124" cy="100" r="4" fill="#fff" /></>}
          {blink && <><rect x="66" y="103" width="28" height="3" fill={DARK} /><rect x="106" y="103" width="28" height="3" fill={DARK} /></>}
        </>
      ) : (
        <>
          <ellipse cx="82" cy="108" rx={eyeRx} ry={eyeRy} fill={DARK} />
          <ellipse cx="118" cy="108" rx={eyeRx} ry={eyeRy} fill={DARK} />
          {!blink && <><circle cx="84" cy="105" r="2" fill="#fff" /><circle cx="120" cy="105" r="2" fill="#fff" /></>}
        </>
      )}

      {/* Nose / beak + mouth */}
      {animal === "pig" ? (
        <>
          <ellipse cx="100" cy="130" rx="22" ry="16" fill="#d98a8a" />
          <ellipse cx="92" cy="130" rx="4" ry="6" fill={DARK} />
          <ellipse cx="108" cy="130" rx="4" ry="6" fill={DARK} />
          {open < 0.15 ? (
            <path d="M86 150 q14 8 28 0" fill="none" stroke={DARK} strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <ellipse cx="100" cy={152} rx={8 - open * 2} ry={2 + open * 6} fill="#7a3b32" />
          )}
        </>
      ) : animal === "owl" ? (
        <path d={`M100 118 l-9 0 l9 ${12 + open * 12} Z M100 118 l9 0 l-9 ${12 + open * 12} Z`} fill="#d9a05f" />
      ) : (
        <>
          <path d="M100 132 l-9 -8 h18 Z" fill={DARK} />
          {open < 0.15 ? (
            <path d="M100 140 q-10 8 -18 2 M100 140 q10 8 18 2" fill="none" stroke={DARK} strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <ellipse cx="100" cy={146} rx={7 - open * 2} ry={2 + open * 7} fill="#7a3b32" />
          )}
          {/* whiskers for cat/fox */}
          {(animal === "cat" || animal === "fox") && (
            <g stroke={DARK} strokeWidth="1.5" opacity="0.5" strokeLinecap="round">
              <line x1="66" y1="136" x2="44" y2="132" /><line x1="66" y1="142" x2="44" y2="144" />
              <line x1="134" y1="136" x2="156" y2="132" /><line x1="134" y1="142" x2="156" y2="144" />
            </g>
          )}
        </>
      )}
    </svg>
  );
}
