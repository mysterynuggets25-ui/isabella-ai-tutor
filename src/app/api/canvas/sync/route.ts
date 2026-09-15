import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth";
import { syncCanvasToDb } from "@/lib/canvas";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/canvas/sync — pull the latest assessments from Canvas now.
// Parent-triggered (the console button). The pages also auto-sync when opened.
export async function GET() {
  const { role } = await getUserRole();
  if (role !== "parent" && role !== "learner") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!process.env.CANVAS_ICS_URL) {
    return NextResponse.json({ error: "Canvas not connected" }, { status: 400 });
  }
  try {
    const count = await syncCanvasToDb();
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return NextResponse.json({ error: "Sync failed", detail: (e as Error).message }, { status: 502 });
  }
}
