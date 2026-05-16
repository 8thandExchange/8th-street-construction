/**
 * Publishable Supabase credentials (URL + anon key). Used by browser, middleware,
 * server components, and anonymous server reads.
 */
export function getSupabaseProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.local.example to .env.local and set values from Supabase → Project Settings → API."
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and set the anon public key from Supabase → Project Settings → API."
    );
  }
  return key;
}
