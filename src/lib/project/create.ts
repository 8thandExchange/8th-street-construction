import type { createClient } from "@/lib/supabase/server";
import { slugifyProjectTitle } from "@/lib/utils";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

const VALID_CATEGORIES = [
  "custom_home",
  "residential_renovation",
  "commercial_new_build",
  "tenant_buildout",
  "design_build",
  "historic_restoration",
];

/** Returns a project slug guaranteed not to collide with an existing project. */
export async function uniqueProjectSlug(
  supabase: ServerSupabase,
  title: string,
  fallback = "project"
): Promise<string> {
  const base = slugifyProjectTitle(title) || fallback;
  const { data } = await supabase
    .from("projects")
    .select("slug")
    .ilike("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 200; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Normalizes an arbitrary project_type to a valid project_category, or null. */
export function normalizeCategory(value: unknown): string {
  const v = String(value ?? "").trim();
  return VALID_CATEGORIES.includes(v) ? v : "residential_renovation";
}
