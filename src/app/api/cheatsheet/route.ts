import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import { generateCheatSheet } from "@/lib/tutor/model";
import { curriculumReference } from "@/lib/curriculum";

export const runtime = "nodejs";

// POST /api/cheatsheet  { subjectKey, topic? }
export async function POST(req: NextRequest) {
  const { role } = await getUserRole();
  if (role !== "learner" && role !== "parent") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { subjectKey, topic } = await req.json();
  if (!subjectKey) return NextResponse.json({ error: "Pick a subject" }, { status: 400 });

  const supabase = await createClient();
  const [{ data: subject }, { data: profile }, { data: notes }] = await Promise.all([
    supabase.from("subjects").select("name,active").eq("key", subjectKey).single(),
    supabase.from("learner_profile").select("summary,dimensions").eq("subject_key", subjectKey).maybeSingle(),
    supabase.from("profile_notes").select("note").eq("subject_key", subjectKey).order("created_at", { ascending: false }).limit(8),
  ]);
  if (!subject?.active) return NextResponse.json({ error: "Subject not available" }, { status: 400 });

  try {
    const sheet = await generateCheatSheet({
      subjectName: subject.name,
      topic: typeof topic === "string" && topic.trim() ? topic.trim() : undefined,
      criteria: curriculumReference(subjectKey),
      profileSummary: profile?.summary,
      dimensions: (profile?.dimensions as Record<string, unknown>) ?? {},
      notes: (notes ?? []).map((n) => n.note),
    });
    return NextResponse.json(sheet);
  } catch (e) {
    return NextResponse.json({ error: "Could not build it", detail: (e as Error).message }, { status: 502 });
  }
}
