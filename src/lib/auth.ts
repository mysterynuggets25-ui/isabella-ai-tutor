import { createClient } from "@/lib/supabase/server";

export type Role = "parent" | "learner" | null;

// Returns the signed-in user and their app role, or nulls if not signed in.
export async function getUserRole(): Promise<{ userId: string | null; role: Role }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null };

  const { data } = await supabase
    .from("app_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return { userId: user.id, role: (data?.role as Role) ?? null };
}
