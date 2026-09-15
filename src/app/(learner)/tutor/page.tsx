"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TutorCharacter from "@/components/TutorCharacter";
import {
  DEFAULT_PERSONA,
  getPersona,
  savePersona,
  SKIN_TONES,
  HAIR_COLORS,
  HAIR_STYLES,
  type Persona,
} from "@/lib/persona";

// Isabella makes her tutor her own: name, skin tone, hair colour and style.
// Saved to her device. Ownership is most of the adoption problem at fifteen.
export default function CustomiseTutorPage() {
  const router = useRouter();
  const [p, setP] = useState<Persona>(DEFAULT_PERSONA);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setP(getPersona());
  }, []);

  function update(patch: Partial<Persona>) {
    setP((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }

  function save() {
    savePersona(p);
    setSaved(true);
    setTimeout(() => router.push("/"), 700);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Make your tutor yours</h1>
      <p className="mt-1 text-sm text-ink/60">Give them a name and a look. You can change it any time.</p>

      <div className="mt-6 flex flex-col items-center rounded-3xl bg-gradient-to-b from-teal-deep to-teal p-6">
        <TutorCharacter size={140} look={{ skin: p.skin, hair: p.hair, hairStyle: p.hairStyle }} />
        <div className="mt-3 text-lg font-semibold text-white">{p.name || "…"}</div>
      </div>

      <label className="mt-6 block text-sm font-semibold">Name</label>
      <input
        value={p.name}
        onChange={(e) => update({ name: e.target.value.slice(0, 20) })}
        placeholder="Mia"
        className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-3 outline-none focus:border-teal"
      />

      <Section title="Skin">
        {SKIN_TONES.map((c) => (
          <Swatch key={c} color={c} active={p.skin === c} onClick={() => update({ skin: c })} />
        ))}
      </Section>

      <Section title="Hair colour">
        {HAIR_COLORS.map((c) => (
          <Swatch key={c} color={c} active={p.hair === c} onClick={() => update({ hair: c })} />
        ))}
      </Section>

      <Section title="Hair style">
        {HAIR_STYLES.map((s) => (
          <button
            key={s}
            onClick={() => update({ hairStyle: s })}
            className={`rounded-full border px-4 py-2 text-sm capitalize ${
              p.hairStyle === s ? "border-teal bg-teal text-white" : "border-sand text-ink/70"
            }`}
          >
            {s}
          </button>
        ))}
      </Section>

      <button
        onClick={save}
        className="mt-8 w-full rounded-full bg-coral py-3 text-lg font-semibold text-white hover:bg-coral-deep"
      >
        {saved ? "Saved!" : "Save my tutor"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={color}
      className={`h-10 w-10 rounded-full ring-2 ring-offset-2 transition ${
        active ? "ring-teal" : "ring-transparent"
      }`}
      style={{ backgroundColor: color }}
    />
  );
}
