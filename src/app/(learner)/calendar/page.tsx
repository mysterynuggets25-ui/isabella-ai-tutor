import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/streak";
import { maybeSyncCanvas } from "@/lib/canvas";
import { HOLIDAYS } from "@/lib/holidays";
import CalendarBoard from "@/components/CalendarBoard";

// Calendar — her month as an organiser: tap any day to see classes, assessments
// (with details), exams and holidays, plus the streak. Assessments sync from
// Canvas automatically.
export default async function CalendarPage() {
  await maybeSyncCanvas();
  const supabase = await createClient();
  const [{ data: sessions }, { data: settings }, { data: due }, { data: subjects }] = await Promise.all([
    supabase.from("sessions").select("started_at").limit(2000),
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("assessments").select("title,due_date,subject_key,next_step").eq("done", false).order("due_date"),
    supabase.from("subjects").select("key,name").eq("active", true).order("sort_order"),
  ]);

  const { current, best, days } = computeStreak((sessions ?? []).map((s) => new Date(s.started_at)));

  return (
    <div>
      <h1 className="text-3xl">Calendar</h1>
      <p className="mt-1 text-sm text-ink/55">Tap a day to see what&apos;s on. Assessments come straight from Canvas.</p>
      <div className="mt-5">
        <CalendarBoard
          activeDays={[...days]}
          sessionDays={settings?.session_days ?? ["Tue", "Thu", "Sat"]}
          subjects={subjects ?? []}
          assessments={(due ?? []).filter((a) => a.due_date)}
          holidays={HOLIDAYS}
          streak={current}
          best={best}
          holidayMode={settings?.holiday_mode ?? "reduced"}
        />
      </div>
    </div>
  );
}
