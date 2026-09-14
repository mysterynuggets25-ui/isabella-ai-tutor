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
    supabase.from("subjects").select("name").eq("key", subject).single(),
    supabase.from("settings").select("*").eq("id", 1).single(),
  ]);

  return (
    <SessionChat
      subjectKey={subject}
      subjectName={subj?.name ?? "your subject"}
      mode={mode === "adhoc" ? "adhoc" : "scheduled"}
      tutorName={settings?.tutor_name ?? "Mia"}
      sessionLengthMin={settings?.session_length_min ?? 30}
      voiceSpeed={Number(settings?.voice_speed ?? 1)}
    />
  );
}
