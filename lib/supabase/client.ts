import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses the public publishable key (safe to ship to the
 * client); all writes are guarded by Row-Level Security against the signed-in
 * user, so no service-role key is ever exposed.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
