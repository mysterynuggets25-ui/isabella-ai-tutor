import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// POST /api/push/subscribe { subscription } — store this browser's push subscription.
export async function POST(req: NextRequest) {
  const { userId, role } = await getUserRole();
  if (!userId || !role) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { subscription } = await req.json();
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Bad subscription" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from("push_subscriptions").upsert(
    { user_id: userId, role, endpoint, p256dh, auth },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe { endpoint } — turn reminders off for this browser.
export async function DELETE(req: NextRequest) {
  const { userId } = await getUserRole();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "No endpoint" }, { status: 400 });
  const service = createServiceClient();
  await service.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
