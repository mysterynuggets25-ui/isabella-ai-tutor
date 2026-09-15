"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Subject = { key: string; name: string; active: boolean; level: string; sort_order: number };
type Settings = {
  id: number;
  age: number;
  year_level: string;
  learning_supports: string[];
  session_length_min: number;
  session_days: string[];
  tone: string;
  monthly_cap_usd: number;
  holiday_mode: string;
};

const SUPPORTS = ["dyslexia", "adhd", "processing", "anxiety"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LEVELS = ["support", "standard", "advanced"];

export default function SettingsPage() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: subs }, { data: st }] = await Promise.all([
        supabase.from("subjects").select("*").order("sort_order"),
        supabase.from("settings").select("*").eq("id", 1).single(),
      ]);
      setSubjects(subs ?? []);
      setSettings(st as Settings);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function updateSubject(key: string, patch: Partial<Subject>) {
    setSubjects((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    await supabase.from("subjects").update(patch).eq("key", key);
    flash();
  }

  async function updateSettings(patch: Partial<Settings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await supabase.from("settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    flash();
  }

  if (!settings) return <p className="text-ink/50">Loading…</p>;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Subjects &amp; settings</h1>
        <span className={`text-sm text-teal transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>
          Saved
        </span>
      </div>
      <p className="-mt-6 text-sm text-ink/50">Changes apply to her next session.</p>

      {/* Subjects */}
      <section>
        <h2 className="font-semibold">Subjects</h2>
        <div className="mt-3 divide-y divide-sand rounded-xl border border-sand">
          {subjects.map((s) => (
            <div key={s.key} className="flex flex-wrap items-center gap-3 p-4">
              <label className="flex flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  checked={s.active}
                  onChange={(e) => updateSubject(s.key, { active: e.target.checked })}
                  className="h-4 w-4 accent-teal"
                />
                <span className="font-medium">{s.name}</span>
              </label>
              <select
                value={s.level}
                onChange={(e) => updateSubject(s.key, { level: e.target.value })}
                className="rounded-lg border border-sand px-3 py-1.5 text-sm"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l} className="capitalize">
                    {l}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Learning supports */}
      <section>
        <h2 className="font-semibold">Learning supports</h2>
        <p className="mt-1 text-sm text-ink/60">
          Not cosmetic. These change chunk length, timers, typeface and how wrong answers are handled.
          Set what you observe, even without a diagnosis. Reversible any time.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUPPORTS.map((sup) => {
            const on = settings.learning_supports.includes(sup);
            return (
              <button
                key={sup}
                onClick={() =>
                  updateSettings({
                    learning_supports: on
                      ? settings.learning_supports.filter((x) => x !== sup)
                      : [...settings.learning_supports, sup],
                  })
                }
                className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
                  on ? "border-teal bg-teal text-white" : "border-sand text-ink/70"
                }`}
              >
                {sup}
              </button>
            );
          })}
        </div>
      </section>

      {/* Schedule */}
      <section>
        <h2 className="font-semibold">Schedule</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {DAYS.map((d) => {
            const on = settings.session_days.includes(d);
            return (
              <button
                key={d}
                onClick={() =>
                  updateSettings({
                    session_days: on
                      ? settings.session_days.filter((x) => x !== d)
                      : [...settings.session_days, d],
                  })
                }
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  on ? "border-teal bg-teal text-white" : "border-sand text-ink/70"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-ink/60">Session length</span>
          {[15, 20, 30].map((m) => (
            <button
              key={m}
              onClick={() => updateSettings({ session_length_min: m })}
              className={`rounded-lg border px-3 py-1.5 ${
                settings.session_length_min === m ? "border-teal bg-teal text-white" : "border-sand"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </section>

      {/* Tone */}
      <section>
        <h2 className="font-semibold">Tone</h2>
        <div className="mt-3 flex gap-2 text-sm">
          {["warm", "balanced", "brisk"].map((t) => (
            <button
              key={t}
              onClick={() => updateSettings({ tone: t })}
              className={`rounded-lg border px-4 py-1.5 capitalize ${
                settings.tone === t ? "border-teal bg-teal text-white" : "border-sand"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Holidays */}
      <section>
        <h2 className="font-semibold">School holidays</h2>
        <p className="mt-1 text-sm text-ink/60">How tutoring runs during the school breaks.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {[
            { v: "off", label: "Take a break", desc: "No sessions" },
            { v: "reduced", label: "Lighter", desc: "Fewer days" },
            { v: "normal", label: "Keep going", desc: "As usual" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => updateSettings({ holiday_mode: o.v })}
              className={`rounded-xl border px-4 py-2 text-left ${
                (settings.holiday_mode ?? "reduced") === o.v ? "border-sage bg-sage text-white" : "border-sand"
              }`}
            >
              <div className="font-semibold">{o.label}</div>
              <div className={`text-xs ${(settings.holiday_mode ?? "reduced") === o.v ? "text-white/70" : "text-ink/50"}`}>{o.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Cost cap */}
      <section>
        <h2 className="font-semibold">Monthly cost cap</h2>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-ink/60">Stop at</span>
          <input
            type="number"
            value={settings.monthly_cap_usd}
            onChange={(e) => updateSettings({ monthly_cap_usd: Number(e.target.value) })}
            className="w-24 rounded-lg border border-sand px-3 py-1.5"
          />
          <span className="text-ink/60">USD / month</span>
        </div>
      </section>
    </div>
  );
}
