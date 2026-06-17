/**
 * Seed 608 Macon Ave — playbook + optional cost plan + Habitat client link.
 * Run: npx tsx scripts/seed-608-macon.ts
 * Flags:
 *   --cost-plan   Import permit-set cost estimate (NOT client billing)
 *   --client      Link Habitat Augusta portal contact (creates if needed)
 */
import { createClient } from "@supabase/supabase-js";
import { applyPlaybookToProject } from "../src/lib/build/apply-playbook";
import { DEFAULT_PLAYBOOK_ID } from "../src/lib/build/playbook-registry";
import { HABITAT_608_MACON } from "../src/lib/billing/constants";
import {
  ESTIMATE_DIVISIONS,
  MACON_608_DIVISION_ESTIMATES,
  sumDivisionEstimates,
} from "../src/lib/estimate/divisions";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const withCostPlan = process.argv.includes("--cost-plan");
const withClient = process.argv.includes("--client");
const habitatEmail =
  process.env.HABITAT_CLIENT_EMAIL || HABITAT_608_MACON.clientContactEmail;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedCostPlan(projectId: string) {
  const { count } = await sb
    .from("project_estimate_lines")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) > 0) {
    console.log("Cost plan: lines already exist, skipped.");
    return;
  }

  const directTotal = sumDivisionEstimates(MACON_608_DIVISION_ESTIMATES);
  const rows = ESTIMATE_DIVISIONS.map((div, i) => ({
    project_id: projectId,
    division_code: div.code,
    trade_label: div.tradeLabel,
    description: div.description,
    estimated_amount: MACON_608_DIVISION_ESTIMATES[div.code] ?? 0,
    display_order: i,
  }));

  const { error } = await sb.from("project_estimate_lines").insert(rows);
  if (error) throw error;

  await sb
    .from("projects")
    .update({
      estimated_cost: directTotal,
      estimate_notes: "Imported from permit set — refine as sub quotes arrive.",
      estimate_updated_at: new Date().toISOString(),
      square_footage: HABITAT_608_MACON.heatedSquareFeet,
    })
    .eq("id", projectId);

  console.log(`Cost plan: ${rows.length} lines, ${directTotal.toLocaleString()} direct costs.`);
}

async function linkHabitatClient(projectId: string) {
  let clientId: string | null = null;

  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("email", habitatEmail)
    .maybeSingle();

  if (existing) {
    clientId = existing.id;
  } else {
    const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
      email: habitatEmail,
      email_confirm: true,
      user_metadata: {
        first_name: "Habitat",
        last_name: "Augusta",
      },
    });
    if (authErr) throw authErr;
    clientId = authUser.user.id;

    await sb.from("profiles").upsert({
      id: clientId,
      email: habitatEmail,
      role: "client",
      first_name: "Habitat",
      last_name: "Augusta",
    });
    console.log("Created portal user:", habitatEmail);
  }

  await sb.from("projects").update({ client_id: clientId }).eq("id", projectId);
  console.log("Linked client to 608 Macon.");
}

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
    const { data: created, error } = await sb
      .from("projects")
      .insert({
        slug,
        title: "608 Macon Ave",
        subtitle: "Habitat for Humanity — custom residential new construction",
        category: "custom_home",
        status: "pre_construction",
        location: "Augusta, GA",
        street_address: "608 Macon Ave",
        jurisdiction: "City of Augusta, Richmond County, GA",
        excerpt: "Active Habitat build in Augusta.",
        square_footage: HABITAT_608_MACON.heatedSquareFeet,
        internal_notes: `Habitat for Humanity build. Architect: ${HABITAT_608_MACON.architect}.`,
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
        square_footage: HABITAT_608_MACON.heatedSquareFeet,
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

  if (withCostPlan) await seedCostPlan(project.id);
  if (withClient) await linkHabitatClient(project.id);

  console.log(`\n→ Master board: /admin/projects/${project.id}`);
  console.log(`→ Cost plan:    /admin/projects/${project.id}/costs`);
  console.log(`→ Invoices:     /admin/projects/${project.id}/billing`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
