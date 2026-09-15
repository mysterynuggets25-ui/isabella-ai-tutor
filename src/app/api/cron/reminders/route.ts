import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// GET /api/cron/reminders — runs daily (Vercel Cron). On a session day it pushes
// "you've got a session today" to every browser that turned reminders on.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const qs = new URL(req.url).searchParams.get("secret");
  if (secret && auth !== `Bearer ${secret}` && qs !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@example.com", pub, priv);

  const service = createServiceClient();
  const { data: settings } = await service.from("settings").select("session_days").eq("id", 1).single();
  const sessionDays: string[] = settings?.session_days ?? ["Tue", "Thu", "Sat"];

  // Weekday today in Sydney (Vercel runs in UTC).
  const wd = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", weekday: "short" }).format(new Date());
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!sessionDays.includes(wd) && !force) {
    return NextResponse.json({ ok: true, sent: 0, reason: `not a session day (${wd})` });
  }

  const { data: subs } = await service.from("push_subscriptions").select("*").eq("role", "learner");
  const payload = JSON.stringify({
    title: "Tutoring today",
    body: "You've got a session today. Even ten minutes counts.",
    url: "/",
  });

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await service.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }
  return NextResponse.json({ ok: true, sent });
}
