import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUserRole } from "@/lib/auth";
import { buildTutorPrompt } from "@/lib/tutor/prompt";
import { runTutor, type ChatTurn } from "@/lib/tutor/model";
import { screenLearnerMessage, SAFE_RESPONSE } from "@/lib/tutor/safety";
import { curriculumReference } from "@/lib/curriculum";

export const runtime = "nodejs";

// POST /api/tutor
// body: { subjectKey, mode: 'scheduled'|'adhoc', message, sessionId? }
export async function POST(req: NextRequest) {
  const { role } = await getUserRole();
  if (role !== "learner" && role !== "parent") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const subjectKey: string = body.subjectKey;
  const mode: "scheduled" | "adhoc" = body.mode === "adhoc" ? "adhoc" : "scheduled";
  const message: string = (body.message ?? "").toString();
  let sessionId: string | undefined = body.sessionId;

  if (!subjectKey || !message.trim()) {
    return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
  }

  const supabase = await createClient();

  // Load config (RLS lets the learner read these).
  const [{ data: settings }, { data: subject }, { data: profile }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("subjects").select("key,name,level,active").eq("key", subjectKey).single(),
    supabase.from("learner_profile").select("*").eq("subject_key", subjectKey).maybeSingle(),
  ]);

  if (!settings || !subject || !subject.active) {
    return NextResponse.json({ error: "Subject not available" }, { status: 400 });
  }

  // Start a session if this is the first message.
  if (!sessionId) {
    const { data: created, error } = await supabase
      .from("sessions")
      .insert({ subject_key: subjectKey, mode, status: "active" })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: "Could not start session" }, { status: 500 });
    }
    sessionId = created.id as string;
  }

  // Record her message first.
  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "learner",
    content: message,
  });

  // Safety screen on her own words. High-recall on purpose.
  const hit = screenLearnerMessage(message);
  if (hit) {
    const service = createServiceClient();
    await service.from("safety_flags").insert({
      session_id: sessionId,
      category: hit.category,
      excerpt: hit.excerpt,
      message_shown: SAFE_RESPONSE,
    });
    await supabase.from("messages").insert({
      session_id: sessionId,
      role: "tutor",
      content: SAFE_RESPONSE,
    });
    return NextResponse.json({ sessionId, reply: SAFE_RESPONSE, flagged: true });
  }

  // Build the prompt and the running transcript.
  const system = buildTutorPrompt({
    settings,
    subject,
    profile: profile ?? null,
    mode,
    curriculumReference: curriculumReference(subjectKey),
  });

  const { data: history } = await supabase
    .from("messages")
    .select("role,content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const turns: ChatTurn[] = (history ?? [])
    .filter((m) => m.role === "learner" || m.role === "tutor")
    .map((m) => ({ role: m.role as "learner" | "tutor", content: m.content }));

  let reply: string;
  try {
    reply = await runTutor({ system, turns, mode });
  } catch (e) {
    return NextResponse.json(
      { error: "Tutor unavailable", detail: (e as Error).message },
      { status: 502 },
    );
  }

  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "tutor",
    content: reply,
  });

  return NextResponse.json({ sessionId, reply });
}
