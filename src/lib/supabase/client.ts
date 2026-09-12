import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client (anon key + RLS). Used by client components
// for the learner app and the parent console.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
