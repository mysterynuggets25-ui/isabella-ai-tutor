"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGoals } from "@/lib/goals";

// Gently nudges Isabella to set a goal if she hasn't — encouragement, not pressure.
export default function GoalNudge() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(getGoals().length === 0), []);
  if (!show) return null;
  return (
    <Link href="/me" className="block rounded-2xl border border-dashed border-sage/50 bg-sage/5 p-4 text-center text-sm font-medium text-sage-deep hover:bg-sage/10">
      🎯 Set yourself a small goal this week — Penny will help you get there.
    </Link>
  );
}
