"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Assessment = { title: string; due_date: string; subject_key: string | null; next_step: string | null };
type Holiday = { start: string; end: string; label: string };
type Subject = { key: string; name: string };

type Ev =
  | { kind: "exam" | "quiz" | "assessment"; title: string; subjectKey: string | null; details: string | null }
  | { kind: "class"; title: string; subjectKey: string }
  | { kind: "holiday"; title: string };

function key(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function assessmentKind(title: string, details: string | null): "exam" | "quiz" | "assessment" {
  const s = `${title} ${details ?? ""}`.toLowerCase();
  if (/\bquiz\b/.test(s)) return "quiz";
  if (/exam|examination|\btest\b/.test(s)) return "exam";
  return "assessment";
}

const STYLE: Record<string, { chip: string; badge: string; emoji: string; label: string }> = {
  exam: { chip: "bg-terracotta text-white", badge: "bg-terracotta text-white", emoji: "📝", label: "Exam" },
  quiz: { chip: "bg-gold/25 text-ink/80", badge: "bg-gold text-white", emoji: "✏️", label: "Quiz" },
  assessment: { chip: "bg-terracotta/15 text-terracotta-deep", badge: "bg-terracotta/15 text-terracotta-deep", emoji: "📄", label: "Assessment" },
  class: { chip: "bg-sage/15 text-sage-deep", badge: "bg-sage/15 text-sage-deep", emoji: "🎓", label: "Lesson" },
  holiday: { chip: "bg-gold/15 text-ink/50", badge: "bg-gold/15 text-ink/50", emoji: "🌴", label: "Holiday" },
};

export default function CalendarBoard({
  activeDays,
  sessionDays,
  subjects,
  assessments,
  holidays,
  streak,
  best,
}: {
  activeDays: string[];
  sessionDays: string[];
  subjects: Subject[];
  assessments: Assessment[];
  holidays: Holiday[];
  streak: number;
  best: number;
}) {
  const today = new Date();
  const [offset, setOffset] = useState(0); // months from current
  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();
  const todayKey = key(today.getFullYear(), today.getMonth(), today.getDate());

  const activeSet = useMemo(() => new Set(activeDays), [activeDays]);

  // Build a map of dayKey -> events.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Ev[]>();
    const push = (k: string, e: Ev) => map.set(k, [...(map.get(k) ?? []), e]);

    for (const a of assessments) {
      push(a.due_date, { kind: assessmentKind(a.title, a.next_step), title: a.title, subjectKey: a.subject_key, details: a.next_step });
    }
    // Scheduled classes across the visible month.
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const k = key(year, month, d);
      if (subjects.length && sessionDays.includes(WD[date.getDay()])) {
        const s = subjects[Math.floor(date.getTime() / 86_400_000) % subjects.length];
        push(k, { kind: "class", title: `${s.name}`, subjectKey: s.key });
      }
      for (const h of holidays) if (k >= h.start && k <= h.end) push(k, { kind: "holiday", title: h.label });
    }
    return map;
  }, [assessments, subjects, sessionDays, holidays, year, month]);

  const [selected, setSelected] = useState<string | null>(todayKey);

  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const chipFor = (e: Ev) => ({ cls: STYLE[e.kind].chip, text: `${STYLE[e.kind].emoji} ${e.title}` });
  const selectedEvents = selected ? eventsByDay.get(selected) ?? [] : [];

  // "Up next" — the next few assessments/quizzes/exams across all months.
  const upNext = assessments
    .filter((a) => a.due_date >= todayKey)
    .slice(0, 4)
    .map((a) => ({ ...a, kind: assessmentKind(a.title, a.next_step) }));

  const subjName = (k: string | null) => subjects.find((s) => s.key === k)?.name ?? "School";
  const dueShort = (d: string) => {
    const diff = Math.round((new Date(d + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
    if (diff <= 0) return "today";
    if (diff === 1) return "tomorrow";
    return new Date(d + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset(offset - 1)} className="rounded-full border border-sand px-3 py-1 text-ink/60 hover:border-sage">←</button>
          <span className="font-display text-lg">{view.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</span>
          <button onClick={() => setOffset(offset + 1)} className="rounded-full border border-sand px-3 py-1 text-ink/60 hover:border-sage">→</button>
          {offset !== 0 && <button onClick={() => setOffset(0)} className="text-xs text-sage underline">today</button>}
        </div>
        <div className="flex items-center gap-1.5 rounded-2xl bg-terracotta/10 px-3 py-1.5">
          <span>🔥</span>
          <span className="font-display text-lg text-terracotta-deep">{streak}</span>
          <span className="text-[10px] uppercase tracking-wide text-ink/50">day{streak === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Up next — the closest assessments/quizzes/exams, easy to see */}
      {upNext.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Up next</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {upNext.map((a, i) => (
              <Link
                key={i}
                href={a.subject_key ? `/session?subject=${a.subject_key}&mode=adhoc` : "/calendar"}
                className="w-40 shrink-0 rounded-2xl border border-sand bg-paper p-3 hover:border-sage"
              >
                <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STYLE[a.kind].badge}`}>
                  {STYLE[a.kind].emoji} {STYLE[a.kind].label}
                </span>
                <div className="mt-1.5 truncate text-sm font-semibold">{subjName(a.subject_key)}</div>
                <div className="text-[11px] text-terracotta-deep">{dueShort(a.due_date)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-3xl border border-sand bg-paper p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink/35">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((n, i) => {
            if (n === null) return <div key={i} />;
            const k = key(year, month, n);
            const evs = eventsByDay.get(k) ?? [];
            const active = activeSet.has(k);
            const isToday = k === todayKey;
            const isSel = k === selected;
            const holiday = evs.some((e) => e.kind === "holiday");
            const shown = evs.filter((e) => e.kind !== "holiday" || evs.length === 1).slice(0, 2);
            return (
              <button
                key={i}
                onClick={() => setSelected(k)}
                className={`flex min-h-[3.9rem] flex-col rounded-xl p-1 text-left align-top transition sm:min-h-[4.6rem] ${
                  isSel ? "ring-2 ring-sage" : ""
                } ${holiday ? "bg-gold/10" : "bg-cream/60 hover:bg-sand/40"}`}
              >
                <span className={`px-0.5 text-xs font-semibold ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-white" : "text-ink/60"}`}>
                  {n}{active && !isToday && <span className="ml-0.5 text-[9px]">🔥</span>}
                </span>
                <div className="mt-0.5 space-y-0.5 overflow-hidden">
                  {shown.map((e, j) => {
                    const c = chipFor(e);
                    return <div key={j} className={`truncate rounded px-1 py-0.5 text-[9px] leading-tight ${c.cls}`}>{c.text}</div>;
                  })}
                  {evs.length > shown.length && <div className="px-1 text-[9px] text-ink/40">+{evs.length - shown.length}</div>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-sand px-1 pt-2 text-[10px] text-ink/50">
          {(["class", "assessment", "quiz", "exam", "holiday"] as const).map((k) => (
            <span key={k} className="flex items-center gap-1">{STYLE[k].emoji} {STYLE[k].label}</span>
          ))}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="mt-4 rounded-3xl border border-sand bg-paper p-5">
        <h3 className="font-display text-lg">
          {selected ? DAY_FULL[new Date(selected + "T00:00:00").getDay()] + " " + new Date(selected + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long" }) : "Pick a day"}
        </h3>
        {selectedEvents.length === 0 ? (
          <p className="mt-2 text-sm text-ink/55">Nothing on. A good day to get ahead, or take a break.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {selectedEvents.map((e, i) => (
              <div key={i} className="rounded-2xl border border-sand p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLE[e.kind].badge}`}>
                      {STYLE[e.kind].label}
                    </span>
                    <div className="mt-1 text-sm font-medium">{e.title}</div>
                    {"details" in e && e.details && <div className="mt-1 text-xs text-ink/60">{e.details}</div>}
                  </div>
                  {"subjectKey" in e && e.subjectKey && (
                    <Link
                      href={`/session?subject=${e.subjectKey}&mode=${e.kind === "class" ? "scheduled" : "adhoc"}`}
                      className="shrink-0 rounded-full bg-terracotta px-4 py-1.5 text-xs font-semibold text-white hover:bg-terracotta-deep"
                    >
                      {e.kind === "class" ? "Join" : "Prep with Penny"}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {best > 1 && <p className="mt-4 text-xs text-ink/40">Best streak: {best} days. Keep showing up.</p>}
      </div>
    </div>
  );
}
