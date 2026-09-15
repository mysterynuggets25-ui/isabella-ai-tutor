"use client";

import { useEffect, useState } from "react";
import { getGoals, saveGoals, type Goal } from "@/lib/goals";

// Isabella sets her own goals and ticks them off. Encouraging, not assigned.
export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [text, setText] = useState("");

  useEffect(() => setGoals(getGoals()), []);

  function commit(next: Goal[]) {
    setGoals(next);
    saveGoals(next);
  }
  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    commit([...goals, { id: crypto.randomUUID(), text: text.trim(), done: false }]);
    setText("");
  }
  const doneCount = goals.filter((g) => g.done).length;

  return (
    <div className="rounded-3xl border border-sand bg-paper p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">My goals</h2>
        {goals.length > 0 && <span className="text-xs text-ink/50">{doneCount} of {goals.length} done</span>}
      </div>

      <div className="mt-3 space-y-2">
        {goals.map((g) => (
          <label key={g.id} className="flex items-center gap-3 rounded-xl border border-sand px-3 py-2">
            <input
              type="checkbox"
              checked={g.done}
              onChange={() => commit(goals.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)))}
              className="h-4 w-4 accent-sage"
            />
            <span className={`flex-1 text-sm ${g.done ? "text-ink/40 line-through" : ""}`}>{g.text}</span>
            <button onClick={() => commit(goals.filter((x) => x.id !== g.id))} className="text-xs text-ink/30 hover:text-terracotta-deep">
              ✕
            </button>
          </label>
        ))}
        {goals.length === 0 && (
          <p className="text-sm text-ink/50">Set one small goal, like &quot;understand trig by Friday&quot;. Just for you.</p>
        )}
      </div>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a goal"
          className="flex-1 rounded-full border border-sand bg-cream px-4 py-2 text-sm outline-none focus:border-sage"
        />
        <button type="submit" className="rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white">Add</button>
      </form>
    </div>
  );
}
