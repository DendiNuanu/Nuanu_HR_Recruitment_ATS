import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazily-created server-side Supabase admin client.
 * Uses the service role key — never expose this on the client.
 * Lazy init prevents the module from crashing at build time when env vars
 * are not yet populated (e.g. during `next build` on Vercel).
 */
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}
