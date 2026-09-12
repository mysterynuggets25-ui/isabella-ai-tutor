import { createClient } from "@/lib/supabase/server";
import SessionChat from "@/components/SessionChat";

// Server wrapper: resolves the subject name, hands the chat to the client.
export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; mode?: string }>;
}) {
  const { subject = "", mode = "scheduled" } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("name").eq("key", subject).single();

  return (
    <SessionChat
      subjectKey={subject}
      subjectName={data?.name ?? "your subject"}
      mode={mode === "adhoc" ? "adhoc" : "scheduled"}
    />
  );
}
