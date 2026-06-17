/**
 * Server-side, auth-less Supabase client for calling the visual-search
 * SECURITY DEFINER RPCs (upsert_product_embedding / match_product_embeddings).
 *
 * These RPCs are the only door into the `product_embeddings` cache, so the
 * publishable key is enough - no service-role secret required. Singleton +
 * no session persistence (it never acts on behalf of a user).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function rpcClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL / publishable key");
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
