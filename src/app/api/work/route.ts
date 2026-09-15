import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import { markWork, monthlyCostUsd } from "@/lib/tutor/model";
import { curriculumReference } from "@/lib/curriculum";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/work  { subjectKey, text?, imageDataUrl? }
// Returns { working, fixes: [two] }. Never rewrites her work.
export async function POST(req: NextRequest) {
  const { role } = await getUserRole();
  if (role !== "learner" && role !== "parent") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { subjectKey, text, imageDataUrl } = await req.json();
  if (!subjectKey || (!text?.trim() && !imageDataUrl)) {
    return NextResponse.json({ error: "Add a photo or paste your work" }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: subject }, { data: settings }, { data: dueRows }] = await Promise.all([
    supabase.from("subjects").select("name,active").eq("key", subjectKey).single(),
    supabase.from("settings").select("monthly_cap_usd").eq("id", 1).single(),
    // The nearest real assessment for this subject, so we can check her work against it.
    supabase
      .from("assessments")
      .select("title,due_date,next_step")
      .eq("subject_key", subjectKey)
      .eq("done", false)
      .gte("due_date", new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10))
      .order("due_date")
      .limit(1),
  ]);
  if (!subject?.active) return NextResponse.json({ error: "Subject not available" }, { status: 400 });

  const due = dueRows?.[0];
  const assessment = due
    ? `${due.title} (due ${due.due_date})${due.next_step ? `\n${due.next_step}` : ""}`
    : undefined;

  const cap = Number(settings?.monthly_cap_usd ?? 0);
  if (cap > 0 && (await monthlyCostUsd()) >= cap) {
    return NextResponse.json({ error: "We've reached this month's limit. Ask Mum to lift it if you'd like more." }, { status: 429 });
  }

  // Parse a data URL (data:image/png;base64,....) into media type + base64.
  let image: { mediaType: string; data: string } | undefined;
  if (typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:")) {
    const m = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (m) image = { mediaType: m[1], data: m[2] };
  }

  try {
    const result = await markWork({
      subjectName: subject.name,
      criteria: curriculumReference(subjectKey),
      assessment,
      text: typeof text === "string" ? text : undefined,
      image,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Could not read that", detail: (e as Error).message }, { status: 502 });
  }
}
