import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import { markWork } from "@/lib/tutor/model";
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
  const { data: subject } = await supabase.from("subjects").select("name,active").eq("key", subjectKey).single();
  if (!subject?.active) return NextResponse.json({ error: "Subject not available" }, { status: 400 });

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
      text: typeof text === "string" ? text : undefined,
      image,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Could not read that", detail: (e as Error).message }, { status: 502 });
  }
}
