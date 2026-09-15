// ACC 2026 school-holiday periods (the breaks between the terms published at
// acc.edu.au: T1 ends 2 Apr, T2 20 Apr–26 Jun, T3 20 Jul–25 Sep, T4 12 Oct–9 Dec).
// Not in the Canvas feed, so kept here. Used to grey out holidays on the calendar.
export const HOLIDAYS: { start: string; end: string; label: string }[] = [
  { start: "2026-04-03", end: "2026-04-19", label: "Autumn holidays" },
  { start: "2026-06-27", end: "2026-07-19", label: "Winter holidays" },
  { start: "2026-09-26", end: "2026-10-11", label: "Spring holidays" },
  { start: "2026-12-10", end: "2027-01-26", label: "Summer holidays" },
];

export function holidayOn(dateKey: string): string | null {
  for (const h of HOLIDAYS) if (dateKey >= h.start && dateKey <= h.end) return h.label;
  return null;
}

// Is a tutoring session scheduled on this day, given holiday mode?
export function classScheduled(
  dateKey: string,
  weekday: string,
  sessionDays: string[],
  holidayMode: "off" | "reduced" | "normal" = "reduced",
): boolean {
  if (!sessionDays.includes(weekday)) return false;
  if (!holidayOn(dateKey)) return true;
  if (holidayMode === "off") return false;
  if (holidayMode === "normal") return true;
  return sessionDays[0] === weekday; // reduced: keep only the first session day of the week
}
