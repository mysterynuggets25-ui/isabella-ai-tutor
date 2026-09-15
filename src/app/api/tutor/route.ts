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
  const start: boolean = body.start === true;
  const message: string = (body.message ?? "").toString();
  const tutorName: string = (body.tutorName ?? "Mia").toString().slice(0, 20);
  let sessionId: string | undefined = body.sessionId;

  if (!subjectKey || (!start && !message.trim())) {
    return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
  }

  const supabase = await createClient();

  // Load config (RLS lets the learner read these).
  const [{ data: settings }, { data: subject }, { data: profile }, { data: dueRows }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("subjects").select("key,name,level,active").eq("key", subjectKey).single(),
    supabase.from("learner_profile").select("*").eq("subject_key", subjectKey).maybeSingle(),
    supabase.from("assessments").select("title,due_date,subject_key").eq("done", false).order("due_date").limit(6),
  ]);

  if (!settings || !subject || !subject.active) {
    return NextResponse.json({ error: "Subject not available" }, { status: 400 });
  }

  // The lesson plan is grounded in: what the tutor planned last time, how she
  // learns + what she struggles with (profile), and what's due soon.
  const dims = (profile?.dimensions as Record<string, unknown>) ?? {};
  const plannedFocus = typeof dims._next_focus === "string" ? dims._next_focus : undefined;
  const upcoming = (dueRows ?? [])
    .filter((d) => d.due_date)
    .map((d) => `${d.title}${d.subject_key ? ` (${d.subject_key})` : ""} due ${d.due_date}`)
    .join("; ") || undefined;

  const buildSystem = () =>
    buildTutorPrompt({
      settings,
      subject,
      profile: profile ?? null,
      mode,
      curriculumReference: curriculumReference(subjectKey),
      tutorName,
      plannedFocus,
      upcoming,
    });

  // Start a session if needed.
  if (!sessionId) {
    const { data: created, error } = await supabase
      .from("sessions")
      .insert({ subject_key: subjectKey, mode, status: "active", topic: plannedFocus ?? null })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: "Could not start session" }, { status: 500 });
    }
    sessionId = created.id as string;
  }

  // Proactive opener: the tutor leads with the plan. No learner message stored.
  if (start) {
    let opener: string;
    try {
      opener = await runTutor({
        system: buildSystem(),
        turns: [
          {
            role: "learner",
            content:
              "(I've just joined the session. Please start us off: tell me what we're working on today and why, in two or three sentences, then check I'm ready. Do not ask me what I want to do.)",
          },
        ],
        mode,
      });
    } catch (e) {
      return NextResponse.json({ error: "Tutor unavailable", detail: (e as Error).message }, { status: 502 });
    }
    await supabase.from("messages").insert({ session_id: sessionId, role: "tutor", content: opener });
    return NextResponse.json({ sessionId, reply: opener });
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
  const system = buildSystem();

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
