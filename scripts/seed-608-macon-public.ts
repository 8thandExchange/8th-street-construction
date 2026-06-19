/**
 * Publish 608 Macon Ave on the public /projects gallery.
 * Idempotent upsert — safe to re-run.
 *
 * Run: npx tsx scripts/seed-608-macon-public.ts
 *
 * Does not set square footage, dates, contract value, or client names.
 * Narrative is a placeholder until real copy is supplied.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PUBLIC_RECORD = {
  slug: "608-macon-ave",
  title: "608 Macon Avenue",
  subtitle: "Custom home under construction in Augusta",
  category: "custom_home" as const,
  status: "in_progress" as const,
  excerpt: "Active custom home build in Augusta, Georgia.",
  narrative: "PLACEHOLDER: project narrative\n\nReplace with approved copy.",
  hero_image_url: "/img/projects/608-macon-ave.png",
  location: "Augusta, GA",
  street_address: "608 Macon Ave",
  jurisdiction: "City of Augusta, Richmond County, GA",
  display_order: 0,
  featured: true,
  published_at: new Date().toISOString(),
};

async function main() {
  const { data: existing } = await sb
    .from("projects")
    .select("id, slug, published_at")
    .eq("slug", PUBLIC_RECORD.slug)
    .maybeSingle();

  const payload = {
    ...PUBLIC_RECORD,
    published_at: existing?.published_at ?? PUBLIC_RECORD.published_at,
  };

  if (existing) {
    const { error } = await sb.from("projects").update(payload).eq("id", existing.id);
    if (error) throw error;
    console.log("Updated public record:", existing.id);
  } else {
    const { data, error } = await sb.from("projects").insert(payload).select("id").single();
    if (error) throw error;
    console.log("Created public record:", data.id);
  }

  console.log("\nPublic URLs:");
  console.log("  /projects");
  console.log("  /projects/608-macon-ave");
  console.log("\nSQL equivalent: scripts/sql/seed-608-macon-public.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
