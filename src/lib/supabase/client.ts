import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/project-env";

export function createClient() {
  return createBrowserClient(getSupabaseProjectUrl(), getSupabaseAnonKey());
}
