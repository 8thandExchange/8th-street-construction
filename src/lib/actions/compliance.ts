"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANY_COMPLIANCE_SEED } from "@/lib/compliance/company-compliance-seed";
import { computeComplianceStatus, seedItemToRow } from "@/lib/compliance/compliance-utils";
import { runComplianceReminders } from "@/lib/compliance/compliance-reminders";

function revalidate() {
  revalidatePath("/admin/compliance");
  revalidatePath("/admin");
}

export async function seedCompanyCompliance() {
  await requireAdmin();
  const admin = createAdminClient();
  const { count } = await admin
    .from("company_compliance_items")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    return { error: "Compliance items already exist. Add manually or delete first." };
  }

  await admin.from("company_compliance_items").insert(COMPANY_COMPLIANCE_SEED.map(seedItemToRow));
  revalidate();
  return { ok: true, count: COMPANY_COMPLIANCE_SEED.length };
}

export async function upsertComplianceItem(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = String(formData.get("id") || "").trim();
  const expiresAt = String(formData.get("expires_at") || "").trim() || null;
  const renewalLead = Number(formData.get("renewal_lead_days") || 60);
  const renewalUrgent = Number(formData.get("renewal_urgent_days") || 14);

  const payload = {
    title: String(formData.get("title")).trim(),
    description: String(formData.get("description") || "").trim() || null,
    category: String(formData.get("category")),
    jurisdiction: String(formData.get("jurisdiction") || "").trim() || null,
    holder_name: String(formData.get("holder_name") || "").trim() || null,
    policy_or_license_number:
      String(formData.get("policy_or_license_number") || "").trim() || null,
    issued_at: String(formData.get("issued_at") || "").trim() || null,
    expires_at: expiresAt,
    renewal_lead_days: renewalLead,
    renewal_urgent_days: renewalUrgent,
    renewal_cycle: String(formData.get("renewal_cycle") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
    status: computeComplianceStatus({
      expires_at: expiresAt,
      renewal_lead_days: renewalLead,
      renewal_urgent_days: renewalUrgent,
      status: "pending",
    }),
  };

  if (id) {
    await admin.from("company_compliance_items").update(payload).eq("id", id);
  } else {
    await admin.from("company_compliance_items").insert(payload);
  }
  revalidate();
  return { ok: true };
}

export async function deleteComplianceItem(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("company_compliance_items").delete().eq("id", String(formData.get("id")));
  revalidate();
  return { ok: true };
}

export async function triggerComplianceReminders() {
  await requireAdmin();
  const result = await runComplianceReminders();
  revalidate();
  return result;
}

export async function syncComplianceStatuses() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: items } = await admin.from("company_compliance_items").select("*");
  for (const item of items ?? []) {
    const status = computeComplianceStatus(item);
    await admin.from("company_compliance_items").update({ status }).eq("id", item.id);
  }
  revalidate();
  return { ok: true };
}
