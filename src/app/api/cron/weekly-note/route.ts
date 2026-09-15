import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUserRole } from "@/lib/auth";
import { generateWeeklyNote } from "@/lib/tutor/model";

export const runtime = "nodejs";

// GET /api/cron/weekly-note — generates the week's parent note.
// Auth: Vercel cron (CRON_SECRET) OR a signed-in parent (the console button).
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const { role } = await getUserRole();
  const okSecret = secret && auth === `Bearer ${secret}`;
  if (!okSecret && role !== "parent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ data: sessions }, { data: notes }] = await Promise.all([
    service.from("sessions").select("subject_key,summary,status,started_at").gte("started_at", weekAgo).order("started_at"),
    service.from("profile_notes").select("subject_key,note,created_at").gte("created_at", weekAgo).order("created_at"),
  ]);

  const digest = [
    ...(sessions ?? []).map((s) => `- ${s.subject_key}: ${s.summary || (s.status === "ended" ? "session done" : "session started")}`),
    ...(notes ?? []).map((n) => `  note (${n.subject_key}): ${n.note}`),
  ].join("\n");

  // Monday of this week (Sydney), as the note's key.
  const syd = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Sydney" }));
  const monday = new Date(syd);
  monday.setDate(syd.getDate() - ((syd.getDay() + 6) % 7));
  const weekStart = monday.toISOString().slice(0, 10);
  const weekLabel = monday.toLocaleDateString("en-AU", { day: "numeric", month: "long" });

  let body: string;
  try {
    body = await generateWeeklyNote({ weekLabel, digest });
  } catch (e) {
    return NextResponse.json({ error: "Could not write the note", detail: (e as Error).message }, { status: 502 });
  }

  // One note per week — replace if it already exists.
  await service.from("weekly_notes").delete().eq("week_start", weekStart);
  await service.from("weekly_notes").insert({ week_start: weekStart, body });

  return NextResponse.json({ ok: true, weekStart, body });
}
