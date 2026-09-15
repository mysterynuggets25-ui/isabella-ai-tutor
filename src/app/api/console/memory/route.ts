import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";

export const runtime = "nodejs";

// Parent-managed memory. The tutor auto-manages the brain after each session;
// this lets Sarah manage it too. Parent-only (RLS also enforces it).
//   POST { action: 'save', subjectKey, summary?, level_estimate?, parent_guidance?, dimensions? }
//   POST { action: 'add_note', subjectKey, note }
//   POST { action: 'delete_note', id }
export async function POST(req: NextRequest) {
  const { role } = await getUserRole();
  if (role !== "parent") return NextResponse.json({ error: "Parents only" }, { status: 403 });

  const body = await req.json();
  const supabase = await createClient();

  if (body.action === "save") {
    const subjectKey = String(body.subjectKey ?? "");
    if (!subjectKey) return NextResponse.json({ error: "Missing subject" }, { status: 400 });
    // Only the fields the parent actually sent; leaves everything else (incl. the
    // tutor's dimensions when unchanged) intact.
    const patch: Record<string, unknown> = { subject_key: subjectKey, updated_at: new Date().toISOString() };
    if (typeof body.summary === "string") patch.summary = body.summary.trim() || null;
    if (typeof body.level_estimate === "string") patch.level_estimate = body.level_estimate.trim() || null;
    if (typeof body.parent_guidance === "string") patch.parent_guidance = body.parent_guidance.trim() || null;
    if (body.dimensions && typeof body.dimensions === "object") {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(body.dimensions as Record<string, unknown>)) {
        const key = String(k).trim();
        const val = String(v ?? "").trim();
        if (key && val) clean[key] = val;
      }
      patch.dimensions = clean;
    }
    const { error } = await supabase.from("learner_profile").upsert(patch, { onConflict: "subject_key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add_note") {
    const subjectKey = String(body.subjectKey ?? "");
    const note = String(body.note ?? "").trim();
    if (!subjectKey || !note) return NextResponse.json({ error: "Missing note" }, { status: 400 });
    const { error } = await supabase.from("profile_notes").insert({ subject_key: subjectKey, note, source: "parent" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_note") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { error } = await supabase.from("profile_notes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
