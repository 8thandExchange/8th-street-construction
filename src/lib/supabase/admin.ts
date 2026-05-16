import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/project-env";

/**
 * Service-role client — BYPASSES RLS. Use ONLY in trusted server contexts
 * (API routes, server actions) for operations that must run regardless of
 * the requesting user, e.g. anonymous lead submission, system jobs.
 */
export function createAdminClient() {
  const url = getSupabaseProjectUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (service_role secret from Supabase → Project Settings → API). Never expose this key to the browser."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
