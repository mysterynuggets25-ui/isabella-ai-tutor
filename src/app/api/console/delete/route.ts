import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// POST /api/console/delete { confirm: "DELETE" } — hard-delete Isabella's
// learning data. Keeps the accounts, subjects and settings; wipes everything
// the tutor recorded about her. Not reversible.
export async function POST(req: NextRequest) {
  const { role } = await getUserRole();
  if (role !== "parent") return NextResponse.json({ error: "Parents only" }, { status: 403 });

  const { confirm } = await req.json();
  if (confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm" }, { status: 400 });

  const svc = createServiceClient();
  // Order matters where there are no cascades. messages cascade from sessions.
  await svc.from("safety_flags").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("profile_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("assessments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("weekly_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("learner_profile").delete().neq("subject_key", "");

  return NextResponse.json({ ok: true });
}
