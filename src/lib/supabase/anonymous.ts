import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/project-env";

/** Public reads only — no cookies. Safe for generateStaticParams and other non-request contexts. */
export function createAnonymousClient() {
  return createClient(getSupabaseProjectUrl(), getSupabaseAnonKey());
}
