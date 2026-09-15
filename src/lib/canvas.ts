// Pulls Isabella's assessments + exams from her Canvas calendar feed (.ics) and
// maps them to our subjects. Keeps real assessments (Canvas "assignments" with
// a due time), skips ordinary lessons. Server-only — the feed URL is private.

export type CanvasItem = { title: string; dueDate: string; subjectKey: string | null; details: string | null };

// Pull the useful bits out of a Canvas assessment DESCRIPTION: type, weighting,
// and a short sense of the task — so the tutor knows what to prep her for.
function extractDetails(desc: string): string | null {
  const text = desc.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/&nbsp;/g, " ");
  const section = (name: string): string | null => {
    const re = new RegExp(`${name}\\s*\\n-+\\s*\\n+([\\s\\S]*?)(?:\\n\\n[A-Z][\\w ]{2,}\\n-|$)`, "i");
    const m = text.match(re);
    return m ? m[1].replace(/\n+/g, " ").replace(/\*\s*/g, "").replace(/\s+/g, " ").trim() : null;
  };
  const type = section("Assessment Type");
  const weightM = text.match(/Weighting\s*\n-+\s*\n+\s*([0-9]+\s*%)/i);
  const areas = section("Areas for Assessment");
  const task = section("Task Details");
  const parts = [
    type ? type.slice(0, 60) : "",
    weightM ? `${weightM[1].replace(/\s/g, "")} weighting` : "",
    areas ? areas.slice(0, 60) : "",
    task ? task.slice(0, 160) : "",
  ].filter(Boolean);
  const out = parts.join(" · ").slice(0, 300);
  return out || null;
}

// Map a Canvas course/summary string to one of our subject keys.
function subjectFor(text: string): string | null {
  const t = text.toLowerCase();
  if (/pdhpe|\bpe\b|health|physical/.test(t)) return "pdhpe";
  if (/food tech|food technology|\bfood\b/.test(t)) return "food_tech";
  if (/money|financ|commerce|business/.test(t)) return "money";
  if (/english/.test(t)) return "english";
  if (/math|number/.test(t)) return "maths";
  if (/science|data science|sustainab|chem|bio|physic/.test(t)) return "science";
  if (/hsie|history|geograph|civics/.test(t)) return "hsie";
  if (/bible|christian|religio|faith/.test(t)) return "christian";
  return null;
}

function unfold(ics: string): string[] {
  const out: string[] = [];
  for (const line of ics.split(/\r?\n/)) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) out[out.length - 1] += line.slice(1);
    else out.push(line);
  }
  return out;
}

function sydneyDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function parseDtstart(val: string): { date: string | null; hasTime: boolean } {
  const v = val.trim();
  const dt = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (dt) {
    const d = new Date(Date.UTC(+dt[1], +dt[2] - 1, +dt[3], +dt[4], +dt[5], +dt[6]));
    return { date: sydneyDate(d), hasTime: true };
  }
  const dOnly = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dOnly) return { date: `${dOnly[1]}-${dOnly[2]}-${dOnly[3]}`, hasTime: false };
  return { date: null, hasTime: false };
}

export function parseCanvasIcs(ics: string): CanvasItem[] {
  const lines = unfold(ics);
  const items: CanvasItem[] = [];
  let inEvent = false;
  let summary = "", uid = "", dtstart = "", description = "";

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { inEvent = true; summary = uid = dtstart = description = ""; continue; }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (summary && dtstart) {
        const { date, hasTime } = parseDtstart(dtstart);
        const isAssignment = /assignment/i.test(uid);
        const looksAssessment = /(assessment|task|exam|\btest\b|quiz|notification)/i.test(summary);
        // Real assessments have a due TIME; lessons are all-day. Require a time,
        // then keep Canvas assignments or assessment-worded items (not lessons).
        if (date && hasTime && (isAssignment || looksAssessment) && !/\blesson\b/i.test(summary)) {
          const courseMatch = summary.match(/\[([^\]]*)\]\s*$/);
          const course = courseMatch ? courseMatch[1] : summary;
          const title = summary.replace(/^\[-\]\s*/, "").replace(/\s*\[[^\]]*\]\s*$/, "").trim().slice(0, 120);
          items.push({ title, dueDate: date, subjectKey: subjectFor(course) ?? subjectFor(summary), details: extractDetails(description) });
        }
      }
      continue;
    }
    if (!inEvent) continue;
    if (line.startsWith("SUMMARY")) summary = line.replace(/^SUMMARY[^:]*:/, "");
    else if (line.startsWith("UID")) uid = line.replace(/^UID[^:]*:/, "");
    else if (line.startsWith("DTSTART")) dtstart = line.replace(/^DTSTART[^:]*:/, "");
    else if (line.startsWith("DESCRIPTION")) description = line.replace(/^DESCRIPTION[^:]*:/, "");
  }
  return items;
}

function sydneyToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// Pull the feed and refresh the schedule-sourced assessments (leaves Sarah's
// manual ones alone). Returns how many are current.
export async function syncCanvasToDb(): Promise<number> {
  const url = process.env.CANVAS_ICS_URL;
  if (!url) return 0;
  const { createServiceClient } = await import("@/lib/supabase/service");
  const svc = createServiceClient();
  const items = await fetchCanvasAssessments(url);
  const today = sydneyToday();
  const future = items.filter((i) => i.dueDate >= today);
  await svc.from("assessments").delete().eq("source", "schedule");
  if (future.length) {
    await svc.from("assessments").insert(
      future.map((i) => ({ subject_key: i.subjectKey, title: i.title, due_date: i.dueDate, next_step: i.details, source: "schedule" })),
    );
  }
  return future.length;
}

// Live-ish: called when the calendar/coming-up loads. Re-syncs only if it's
// been more than 15 minutes, so new Canvas items appear without a manual step.
export async function maybeSyncCanvas(): Promise<void> {
  if (!process.env.CANVAS_ICS_URL) return;
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const svc = createServiceClient();
    const { data } = await svc
      .from("assessments")
      .select("created_at")
      .eq("source", "schedule")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const last = data?.created_at ? new Date(data.created_at).getTime() : 0;
    if (Date.now() - last > 15 * 60 * 1000) await syncCanvasToDb();
  } catch {
    // Never let a sync problem break the page.
  }
}

export async function fetchCanvasAssessments(url: string): Promise<CanvasItem[]> {
  const res = await fetch(url, { headers: { "User-Agent": "isabella-tutor" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Canvas feed ${res.status}`);
  const ics = await res.text();
  // De-dupe by title+date (Canvas can list the same task twice).
  const seen = new Set<string>();
  return parseCanvasIcs(ics).filter((i) => {
    const k = `${i.title}|${i.dueDate}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
