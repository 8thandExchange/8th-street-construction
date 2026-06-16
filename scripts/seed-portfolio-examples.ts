/**
 * Seed representative portfolio examples — one per project category.
 * Run: npx tsx scripts/seed-portfolio-examples.ts
 */
import { createClient } from "@supabase/supabase-js";
import { PORTFOLIO_EXAMPLES } from "../src/lib/portfolio-examples";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  for (const example of PORTFOLIO_EXAMPLES) {
    const row = {
      slug: example.slug,
      title: example.title,
      subtitle: example.subtitle,
      category: example.category,
      status: example.status,
      excerpt: example.excerpt,
      narrative: example.narrative,
      hero_image_url: example.heroImage,
      location: example.location,
      year_completed: example.yearCompleted,
      square_footage: example.squareFootage,
      budget_range: example.budgetRange,
      featured: example.featured,
      display_order: example.displayOrder,
      meta_description: example.metaDescription,
      published_at: new Date().toISOString(),
    };

    const { data: existing } = await sb
      .from("projects")
      .select("id, slug")
      .eq("slug", example.slug)
      .maybeSingle();

    if (existing) {
      const { error } = await sb.from("projects").update(row).eq("id", existing.id);
      if (error) throw error;
      console.log(`Updated: ${example.title} (${example.category})`);
    } else {
      const { error } = await sb.from("projects").insert(row);
      if (error) throw error;
      console.log(`Created: ${example.title} (${example.category})`);
    }
  }

  console.log("\nPortfolio examples seeded. View at /projects");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
