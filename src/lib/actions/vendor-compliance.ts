"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { VENDOR_COMPLIANCE_KINDS } from "@/lib/vendors/compliance-kinds";

/** Per-vendor paperwork: COIs, W-9s, licenses, lien waivers. */

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string) {
  const v = str(formData, key);
  return v || null;
}

function revalidate(vendorId: string) {
  revalidatePath(`/admin/vendors/${vendorId}`);
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/compliance");
}

export async function saveVendorComplianceItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  const vendorId = str(formData, "vendor_id");
  const kind = str(formData, "kind");
  if (!VENDOR_COMPLIANCE_KINDS.some((k) => k.value === kind))
    throw new Error("Unknown paperwork kind");

  const label =
    optional(formData, "label") ?? VENDOR_COMPLIANCE_KINDS.find((k) => k.value === kind)!.label;

  const { error } = await supabase.from("vendor_compliance_items").insert({
    vendor_id: vendorId,
    kind,
    label,
    expires_on: optional(formData, "expires_on"),
    received_on: optional(formData, "received_on"),
    notes: optional(formData, "notes"),
  });
  if (error) throw new Error(error.message);
  revalidate(vendorId);
}

export async function deleteVendorComplianceItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  const vendorId = str(formData, "vendor_id");
  const id = str(formData, "id");
  const { error } = await supabase
    .from("vendor_compliance_items")
    .delete()
    .eq("id", id)
    .eq("vendor_id", vendorId);
  if (error) throw new Error(error.message);
  revalidate(vendorId);
}
