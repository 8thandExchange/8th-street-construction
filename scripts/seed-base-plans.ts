/**
 * Upload 8th Street standard house plans and seed the catalog.
 *
 * Place PDFs in data/base-plans/ (see data/base-plans/README.md), or set:
 *   BASE_PLANS_DIR="/path/to/Standard Plans"
 *
 * Run: npx tsx scripts/seed-base-plans.ts
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, statSync } from "fs";
import { basename, join, resolve } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ROOT = process.cwd();
const PLANS_DIR = process.env.BASE_PLANS_DIR
  ? resolve(process.env.BASE_PLANS_DIR)
  : join(ROOT, "data", "base-plans");

type PlanSeed = {
  fileName: string;
  planNumber: string;
  name: string;
  displayOrder: number;
};

/** 8th Street Construction standard catalog — one PDF per model. */
const PLANS: PlanSeed[] = [
  { fileName: "The Augusta.pdf", planNumber: "AUGUSTA", name: "The Augusta", displayOrder: 1 },
  {
    fileName: "The Broad Street.pdf",
    planNumber: "BROAD-STREET",
    name: "The Broad Street",
    displayOrder: 2,
  },
  { fileName: "The Midtown.pdf", planNumber: "MIDTOWN", name: "The Midtown", displayOrder: 3 },
  {
    fileName: "The Riverwalk.pdf",
    planNumber: "RIVERWALK",
    name: "The Riverwalk",
    displayOrder: 4,
  },
  { fileName: "The Savannah.pdf", planNumber: "SAVANNAH", name: "The Savannah", displayOrder: 5 },
  {
    fileName: "The Summerville.pdf",
    planNumber: "SUMMERVILLE",
    name: "The Summerville",
    displayOrder: 6,
  },
];

function storagePath(planNumber: string, fileName: string) {
  const slug = planNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `base-plans/${planNumber}/${slug}/${fileName}`;
}

function resolveFilePath(fileName: string) {
  const direct = join(PLANS_DIR, fileName);
  if (existsSync(direct)) return direct;

  const lower = join(PLANS_DIR, fileName.toLowerCase());
  if (existsSync(lower)) return lower;

  throw new Error(
    `Missing PDF: ${direct}\nCopy your standard plans into data/base-plans/ or set BASE_PLANS_DIR.`
  );
}

async function upsertPlan(plan: PlanSeed) {
  const filePath = resolveFilePath(plan.fileName);
  const fileName = basename(filePath);
  const bytes = readFileSync(filePath);
  const size = statSync(filePath).size;
  const path = storagePath(plan.planNumber, fileName);

  const { error: uploadErr } = await sb.storage
    .from("project-documents")
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) throw new Error(`Upload failed for ${plan.planNumber}: ${uploadErr.message}`);

  const row = {
    plan_number: plan.planNumber,
    name: plan.name,
    designer: "8th Street Construction",
    variant: null,
    sheet_count: null,
    storage_path: path,
    file_type: "application/pdf",
    file_size_bytes: size,
    display_order: plan.displayOrder,
    active: true,
    notes: "Standard base plan for 8th Street Construction lot builds. Lot-specific revisions required before permitting.",
  };

  const { data: existing } = await sb
    .from("house_base_plans")
    .select("id")
    .eq("plan_number", plan.planNumber)
    .is("variant", null)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("house_base_plans").update(row).eq("id", existing.id);
    if (error) throw error;
    console.log(`Updated: ${plan.name}`);
    return existing.id;
  }

  const { data, error } = await sb.from("house_base_plans").insert(row).select("id").single();
  if (error) throw error;
  console.log(`Created: ${plan.name}`);
  return data.id;
}

async function deactivateLegacyPlans(activeNumbers: string[]) {
  const { data: all } = await sb.from("house_base_plans").select("id, plan_number, name, active");
  for (const plan of all ?? []) {
    if (!activeNumbers.includes(plan.plan_number) && plan.active) {
      await sb.from("house_base_plans").update({ active: false }).eq("id", plan.id);
      console.log(`Deactivated legacy plan: ${plan.name} (#${plan.plan_number})`);
    }
  }
}

async function main() {
  console.log(`Seeding 8th Street standard house plans from:\n  ${PLANS_DIR}\n`);

  const activeNumbers: string[] = [];
  for (const plan of PLANS) {
    await upsertPlan(plan);
    activeNumbers.push(plan.planNumber);
  }

  await deactivateLegacyPlans(activeNumbers);
  console.log("\nDone. View catalog at /admin/base-plans");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
