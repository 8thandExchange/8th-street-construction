import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/project-env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Setting cookies from a Server Component is not allowed.
            // Middleware refreshes sessions, so this can be safely ignored.
          }
        },
      },
    }
  );
}
