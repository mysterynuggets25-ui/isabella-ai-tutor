import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUserRole } from "@/lib/auth";
import { summariseSession, type ChatTurn } from "@/lib/tutor/model";

export const runtime = "nodejs";

// POST /api/session  { action: 'end', sessionId }
// Closes a session and writes a structured note back to the learner profile.
export async function POST(req: NextRequest) {
  const { role } = await getUserRole();
  if (role !== "learner" && role !== "parent") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { action, sessionId } = await req.json();
  if (action !== "end" || !sessionId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id,subject_key,status")
    .eq("id", sessionId)
    .single();

  if (!session) return NextResponse.json({ error: "No session" }, { status: 404 });
  if (session.status === "ended") return NextResponse.json({ ok: true, alreadyEnded: true });

  const { data: subject } = await supabase
    .from("subjects")
    .select("name")
    .eq("key", session.subject_key)
    .single();

  // What the tutor already remembers about her in this subject.
  const { data: priorProfile } = await supabase
    .from("learner_profile")
    .select("dimensions")
    .eq("subject_key", session.subject_key)
    .maybeSingle();
  const priorDimensions = (priorProfile?.dimensions as Record<string, unknown>) ?? {};

  const { data: history } = await supabase
    .from("messages")
    .select("role,content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const transcript: ChatTurn[] = (history ?? [])
    .filter((m) => m.role === "learner" || m.role === "tutor")
    .map((m) => ({ role: m.role as "learner" | "tutor", content: m.content }));

  let note = "";
  let summary = "";
  let level_estimate = "";
  let dimensions: Record<string, string> = {};
  let nextFocus = "";
  let concern = "";
  try {
    const s = await summariseSession({
      subjectName: subject?.name ?? session.subject_key,
      transcript,
      priorDimensions,
    });
    note = s.note;
    summary = s.summary;
    level_estimate = s.level_estimate;
    dimensions = s.dimensions;
    nextFocus = s.next_focus;
    concern = s.concern;
  } catch {
    // If summarisation fails, still close the session cleanly.
  }

  const service = createServiceClient();

  // A gentle wellbeing/social concern for the parent (not a crisis — those are
  // separate). Surfaced in the console Wellbeing view.
  if (concern.trim()) {
    await service.from("safety_flags").insert({
      session_id: sessionId,
      category: "concern",
      excerpt: concern.trim(),
    });
  }

  if (note) {
    await service.from("profile_notes").insert({
      subject_key: session.subject_key,
      session_id: sessionId,
      note,
    });
    // Merge the new learning into the tutor's evolving memory (new beliefs win
    // per key, prior beliefs are kept).
    const mergedDimensions = {
      ...priorDimensions,
      ...dimensions,
      ...(nextFocus ? { _next_focus: nextFocus } : {}),
    };
    await service
      .from("learner_profile")
      .upsert(
        {
          subject_key: session.subject_key,
          summary: summary || undefined,
          level_estimate: level_estimate || undefined,
          dimensions: mergedDimensions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "subject_key" },
      );
  }

  await service
    .from("sessions")
    .update({ status: "ended", ended_at: new Date().toISOString(), summary })
    .eq("id", sessionId);

  return NextResponse.json({ ok: true, note, summary });
}
