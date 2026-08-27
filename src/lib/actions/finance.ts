"use server";

import { revalidatePath } from "next/cache";
import {
  APPROVAL_THRESHOLDS_KEY,
  MONTH_CLOSE_KEY,
  loadMonthCloseMap,
} from "@/lib/finance/settings";
import { parseApprovalThresholds } from "@/lib/finance/thresholds";
import { monthKey } from "@/lib/finance/month-close";
import type { User } from "@supabase/supabase-js";

function revalidateFinance() {
  revalidatePath("/admin/accounting");
  revalidatePath("/admin/accounting/forecast");
  revalidatePath("/admin/settings");
}

// site_settings is keyed (org_id, key); the acting admin's JWT claim names
// the tenant the setting belongs to.
function orgIdFromClaim(user: User): string {
  const orgId = user.app_metadata?.org_id;
  if (typeof orgId !== "string" || !orgId) {
    throw new Error("No organization claim on this session.");
  }
  return orgId;
}

export async function saveApprovalThresholds(formData: FormData) {
  const { requireCapability } = await import("@/lib/actions/admin-auth");
  const { supabase, user } = await requireCapability("money.write");
  const thresholds = parseApprovalThresholds({
    invoice: Number(formData.get("invoice")),
    bill: Number(formData.get("bill")),
    purchaseOrder: Number(formData.get("purchaseOrder")),
  });
  const { error } = await supabase.from("site_settings").upsert(
    {
      org_id: orgIdFromClaim(user),
      key: APPROVAL_THRESHOLDS_KEY,
      value: thresholds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,key" }
  );
  if (error) throw new Error(error.message);
  revalidateFinance();
}

export async function closeAccountingMonth(formData: FormData) {
  const { requireCapability } = await import("@/lib/actions/admin-auth");
  const { supabase, user } = await requireCapability("money.write");
  const month = String(formData.get("month") || monthKey(new Date().toISOString()));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const existing = await loadMonthCloseMap();
  const next = {
    ...existing,
    [month]: {
      status: "closed" as const,
      closed_at: new Date().toISOString(),
      notes,
    },
  };
  const { error } = await supabase.from("site_settings").upsert(
    {
      org_id: orgIdFromClaim(user),
      key: MONTH_CLOSE_KEY,
      value: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,key" }
  );
  if (error) throw new Error(error.message);
  revalidateFinance();
}

export async function reopenAccountingMonth(formData: FormData) {
  const { requireCapability } = await import("@/lib/actions/admin-auth");
  const { supabase, user } = await requireCapability("money.write");
  const month = String(formData.get("month"));
  const existing = await loadMonthCloseMap();
  const next = { ...existing, [month]: { status: "open" as const, notes: existing[month]?.notes ?? null } };
  const { error } = await supabase.from("site_settings").upsert(
    {
      org_id: orgIdFromClaim(user),
      key: MONTH_CLOSE_KEY,
      value: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,key" }
  );
  if (error) throw new Error(error.message);
  revalidateFinance();
}
