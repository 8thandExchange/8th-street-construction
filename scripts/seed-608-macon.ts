/**
 * Seed 608 Macon Ave and apply Georgia residential playbook.
 * Run: npx tsx scripts/seed-608-macon.ts
 */
import { createClient } from "@supabase/supabase-js";
import { applyPlaybookToProject } from "../src/lib/build/apply-playbook";
import { DEFAULT_PLAYBOOK_ID } from "../src/lib/build/playbook-registry";

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
  const slug = "608-macon-ave";
  let { data: project } = await sb
    .from("projects")
    .select("id, title, slug, playbook_applied_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!project) {
    const { data: byTitle } = await sb
      .from("projects")
      .select("id, title, slug, playbook_applied_at")
      .or("title.ilike.%608 Macon%,title.ilike.%608 Macon Ave%")
      .maybeSingle();
    project = byTitle;
  }

  if (!project) {
    const { data: all } = await sb.from("projects").select("id, title, slug, playbook_applied_at");
    console.log(
      "Existing projects:",
      all?.map((p) => `${p.title} (${p.slug})`).join(", ") || "none"
    );
    const { data: created, error } = await sb
      .from("projects")
      .insert({
        slug,
        title: "608 Macon Ave",
        subtitle: "Custom residential new construction",
        category: "custom_home",
        status: "pre_construction",
        location: "Augusta, GA",
        street_address: "608 Macon Ave",
        jurisdiction: "City of Augusta, Richmond County, GA",
        excerpt: "Active custom home build in Augusta.",
      })
      .select("id, title, slug, playbook_applied_at")
      .single();
    if (error) throw error;
    project = created!;
    console.log("Created:", project.title);
  } else {
    await sb
      .from("projects")
      .update({
        street_address: "608 Macon Ave",
        location: "Augusta, GA",
        jurisdiction: "City of Augusta, Richmond County, GA",
        slug: project.slug || slug,
      })
      .eq("id", project.id);
    console.log("Updated:", project.title);
  }

  if (!project.playbook_applied_at) {
    const result = await applyPlaybookToProject(project.id, DEFAULT_PLAYBOOK_ID);
    console.log("Playbook:", result);
  } else {
    console.log("Playbook already applied.");
  }

  console.log(`\n→ /admin/projects/${project.id}/build`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
