import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import SessionChat from "@/components/SessionChat";

// Full-screen, immersive "live tutoring call". Deliberately outside the learner
// tab-bar shell so it feels like a scheduled session, not another page.
export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; mode?: string }>;
}) {
  const { role } = await getUserRole();
  if (!role) redirect("/login");

  const { subject = "", mode = "scheduled" } = await searchParams;
  const supabase = await createClient();
  const [{ data: subj }, { data: settings }] = await Promise.all([
    supabase.from("subjects").select("name,active").eq("key", subject).single(),
    supabase.from("settings").select("session_length_min,voice_speed").eq("id", 1).single(),
  ]);

  // Don't let a session open for a subject that isn't switched on.
  if (!subj || !subj.active) redirect("/subjects");

  return (
    <SessionChat
      subjectKey={subject}
      subjectName={subj.name}
      mode={mode === "adhoc" ? "adhoc" : "scheduled"}
      sessionLengthMin={settings?.session_length_min ?? 30}
      voiceSpeed={Number(settings?.voice_speed ?? 1)}
    />
  );
}
