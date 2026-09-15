import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// GET /api/console/export — download everything about Isabella as one JSON file.
export async function GET() {
  const { role } = await getUserRole();
  if (role !== "parent") return NextResponse.json({ error: "Parents only" }, { status: 403 });

  const svc = createServiceClient();
  const [settings, subjects, profile, notes, sessions, messages, assessments, weekly, flags] = await Promise.all([
    svc.from("settings").select("*").eq("id", 1).single(),
    svc.from("subjects").select("*"),
    svc.from("learner_profile").select("*"),
    svc.from("profile_notes").select("*"),
    svc.from("sessions").select("*"),
    svc.from("messages").select("*"),
    svc.from("assessments").select("*"),
    svc.from("weekly_notes").select("*"),
    svc.from("safety_flags").select("*"),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    settings: settings.data,
    subjects: subjects.data,
    learner_profile: profile.data,
    profile_notes: notes.data,
    sessions: sessions.data,
    messages: messages.data,
    assessments: assessments.data,
    weekly_notes: weekly.data,
    safety_flags: flags.data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="isabella-tutor-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
