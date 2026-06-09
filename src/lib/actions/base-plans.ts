"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidateBasePlans() {
  revalidatePath("/admin/base-plans");
  revalidatePath("/admin/projects");
}

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (!value || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeVariant(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export async function createBasePlan(formData: FormData) {
  const { supabase } = await requireAdmin();

  const planNumber = String(formData.get("plan_number") || "")
    .trim()
    .toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const designer = String(formData.get("designer") || "").trim() || "8th Street Construction";
  const variant = normalizeVariant(String(formData.get("variant") || ""));
  const storagePath = String(formData.get("storage_path") || "").trim();
  const fileType = String(formData.get("file_type") || "").trim() || "application/pdf";
  const fileSize = parseOptionalInt(formData.get("file_size_bytes"));
  const sheetCount = parseOptionalInt(formData.get("sheet_count"));
  const displayOrder = parseOptionalInt(formData.get("display_order")) ?? 0;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!planNumber) return { error: "Plan number is required" };
  if (!name) return { error: "Plan name is required" };
  if (!storagePath) return { error: "Upload a PDF before saving" };
  if (!storagePath.startsWith("base-plans/")) {
    return { error: "Invalid storage path" };
  }

  const { data: existing } = await supabase
    .from("house_base_plans")
    .select("id")
    .eq("plan_number", planNumber)
    .is("variant", variant)
    .maybeSingle();

  if (existing) {
    return { error: "A plan with this number and variant already exists" };
  }

  const { error } = await supabase.from("house_base_plans").insert({
    plan_number: planNumber,
    name,
    designer,
    variant,
    sheet_count: sheetCount,
    storage_path: storagePath,
    file_type: fileType,
    file_size_bytes: fileSize,
    display_order: displayOrder,
    notes,
    active: true,
  });

  if (error) return { error: error.message };
  revalidateBasePlans();
  return { ok: true };
}

export async function updateBasePlan(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const designer = String(formData.get("designer") || "").trim() || "8th Street Construction";
  const sheetCount = parseOptionalInt(formData.get("sheet_count"));
  const displayOrder = parseOptionalInt(formData.get("display_order"));
  const notes = String(formData.get("notes") || "").trim() || null;
  const squareFootage = parseOptionalInt(formData.get("square_footage"));
  const bedrooms = parseOptionalInt(formData.get("bedrooms"));
  const bathrooms = formData.get("bathrooms")
    ? Number(formData.get("bathrooms"))
    : null;
  const stories = parseOptionalInt(formData.get("stories"));

  if (!name) return { error: "Plan name is required" };

  const { error } = await supabase
    .from("house_base_plans")
    .update({
      name,
      designer,
      sheet_count: sheetCount,
      display_order: displayOrder ?? 0,
      notes,
      square_footage: squareFootage,
      bedrooms,
      bathrooms: bathrooms != null && Number.isFinite(bathrooms) ? bathrooms : null,
      stories,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateBasePlans();
  return { ok: true };
}

export async function replaceBasePlanPdf(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id"));
  const storagePath = String(formData.get("storage_path") || "").trim();
  const fileType = String(formData.get("file_type") || "").trim() || "application/pdf";
  const fileSize = parseOptionalInt(formData.get("file_size_bytes"));

  if (!storagePath) return { error: "Upload a PDF first" };
  if (!storagePath.startsWith("base-plans/")) {
    return { error: "Invalid storage path" };
  }

  const { data: plan } = await supabase
    .from("house_base_plans")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (!plan) return { error: "Plan not found" };

  const oldPath = plan.storage_path;

  const { error } = await supabase
    .from("house_base_plans")
    .update({
      storage_path: storagePath,
      file_type: fileType,
      file_size_bytes: fileSize,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  if (oldPath && oldPath !== storagePath) {
    await supabase.storage.from("project-documents").remove([oldPath]);
  }

  revalidateBasePlans();
  return { ok: true };
}

export async function toggleBasePlanActive(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  const { error } = await supabase.from("house_base_plans").update({ active }).eq("id", id);

  if (error) return { error: error.message };
  revalidateBasePlans();
  return { ok: true };
}
