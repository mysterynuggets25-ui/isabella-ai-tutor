"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TutorCharacter from "@/components/TutorCharacter";
import {
  DEFAULT_PERSONA,
  getPersona,
  savePersona,
  ANIMALS,
  FUR_COLORS,
  type Persona,
} from "@/lib/persona";

// Isabella makes her tutor her own: which animal, a name, a colour and a voice.
// Saved to her device. Her choosing it is most of why she'll come back.
export default function CustomiseTutorPage() {
  const router = useRouter();
  const [p, setP] = useState<Persona>(DEFAULT_PERSONA);
  const [saved, setSaved] = useState(false);

  useEffect(() => setP(getPersona()), []);

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
      <h1 className="text-2xl">Make your tutor yours</h1>
      <p className="mt-1 text-sm text-ink/60">Pick your animal, name them, and choose a voice. Change it any time.</p>

      <div className="mt-6 flex flex-col items-center rounded-3xl bg-gradient-to-b from-sage to-sage-deep p-6">
        <TutorCharacter size={150} look={{ animal: p.animal, color: p.color }} />
        <div className="mt-3 font-display text-xl text-white">{p.name || "…"}</div>
      </div>

      <Section title="Animal">
        {ANIMALS.map((a) => (
          <button
            key={a.key}
            onClick={() => update({ animal: a.key })}
            className={`rounded-2xl border px-3 py-2 ${
              p.animal === a.key ? "border-sage bg-sage text-white" : "border-sand bg-paper text-ink/70"
            }`}
          >
            <div className="mx-auto h-12 w-12">
              <TutorCharacter size={48} look={{ animal: a.key, color: p.color }} />
            </div>
            <div className="mt-1 text-xs">{a.label}</div>
          </button>
        ))}
      </Section>

      <label className="mt-6 block text-sm font-semibold">Name</label>
      <input
        value={p.name}
        onChange={(e) => update({ name: e.target.value.slice(0, 20) })}
        placeholder="Hazel"
        className="mt-2 w-full rounded-xl border border-sand bg-paper px-4 py-3 outline-none focus:border-sage"
      />

      <Section title="Colour">
        {FUR_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => update({ color: c })}
            aria-label={c}
            className={`h-10 w-10 rounded-full ring-2 ring-offset-2 transition ${
              p.color === c ? "ring-sage" : "ring-transparent"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </Section>

      <Section title="Voice">
        {(["female", "male"] as const).map((v) => (
          <button
            key={v}
            onClick={() => update({ voice: v })}
            className={`rounded-full border px-5 py-2 text-sm capitalize ${
              p.voice === v ? "border-sage bg-sage text-white" : "border-sand text-ink/70"
            }`}
          >
            {v}
          </button>
        ))}
      </Section>

      <button
        onClick={save}
        className="mt-8 w-full rounded-full bg-terracotta py-3 text-lg font-semibold text-white hover:bg-terracotta-deep"
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
