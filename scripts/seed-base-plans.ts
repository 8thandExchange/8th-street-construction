/**
 * Upload Craig Peel base house plans and seed the catalog.
 * Run: npx tsx scripts/seed-base-plans.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync } from "fs";
import { basename } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type PlanSeed = {
  filePath: string;
  planNumber: string;
  name: string;
  variant: string | null;
  sheetCount: number | null;
  displayOrder: number;
};

const PLANS: PlanSeed[] = [
  {
    filePath: "/Users/8thandexchange/Downloads/1344  (32).pdf",
    planNumber: "1344",
    name: "Plan 1344",
    variant: null,
    sheetCount: 32,
    displayOrder: 1,
  },
  {
    filePath: "/Users/8thandexchange/Downloads/1351 (27).pdf",
    planNumber: "1351",
    name: "Plan 1351",
    variant: null,
    sheetCount: 27,
    displayOrder: 2,
  },
  {
    filePath: "/Users/8thandexchange/Downloads/1235 Porch Left (Extended) (28).pdf",
    planNumber: "1235",
    name: "Plan 1235",
    variant: "Porch Left (Extended)",
    sheetCount: 28,
    displayOrder: 3,
  },
  {
    filePath: "/Users/8thandexchange/Downloads/1188 porch left (28).pdf",
    planNumber: "1188",
    name: "Plan 1188",
    variant: "Porch Left",
    sheetCount: 28,
    displayOrder: 4,
  },
  {
    filePath: "/Users/8thandexchange/Downloads/1409 (17).pdf",
    planNumber: "1409",
    name: "Plan 1409",
    variant: null,
    sheetCount: 17,
    displayOrder: 5,
  },
  {
    filePath: "/Users/8thandexchange/Downloads/1551 (29).pdf",
    planNumber: "1551",
    name: "Plan 1551",
    variant: null,
    sheetCount: 29,
    displayOrder: 6,
  },
];

function storagePath(planNumber: string, variant: string | null, fileName: string) {
  const slug = variant
    ? variant.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "standard";
  return `base-plans/${planNumber}/${slug}/${fileName}`;
}

async function upsertPlan(plan: PlanSeed) {
  const fileName = basename(plan.filePath);
  const bytes = readFileSync(plan.filePath);
  const size = statSync(plan.filePath).size;
  const path = storagePath(plan.planNumber, plan.variant, fileName);

  const { error: uploadErr } = await sb.storage
    .from("project-documents")
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) throw new Error(`Upload failed for ${plan.planNumber}: ${uploadErr.message}`);

  const row = {
    plan_number: plan.planNumber,
    name: plan.name,
    designer: "Craig Peel",
    variant: plan.variant,
    sheet_count: plan.sheetCount,
    storage_path: path,
    file_type: "application/pdf",
    file_size_bytes: size,
    display_order: plan.displayOrder,
    active: true,
    notes: "Selected base plan for 8th Street Construction lot builds.",
  };

  const { data: existing } = await sb
    .from("house_base_plans")
    .select("id")
    .eq("plan_number", plan.planNumber)
    .is("variant", plan.variant)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("house_base_plans").update(row).eq("id", existing.id);
    if (error) throw error;
    console.log(`Updated: ${plan.name}${plan.variant ? ` — ${plan.variant}` : ""}`);
    return existing.id;
  }

  const { data, error } = await sb.from("house_base_plans").insert(row).select("id").single();
  if (error) throw error;
  console.log(`Created: ${plan.name}${plan.variant ? ` — ${plan.variant}` : ""}`);
  return data.id;
}

async function main() {
  console.log("Seeding Craig Peel base house plans…\n");
  for (const plan of PLANS) {
    await upsertPlan(plan);
  }
  console.log("\nDone. View at /admin/base-plans");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
