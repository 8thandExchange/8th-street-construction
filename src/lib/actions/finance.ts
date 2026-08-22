"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import {
  APPROVAL_THRESHOLDS_KEY,
  MONTH_CLOSE_KEY,
  loadMonthCloseMap,
} from "@/lib/finance/settings";
import { parseApprovalThresholds } from "@/lib/finance/thresholds";
import { monthKey } from "@/lib/finance/month-close";

function revalidateFinance() {
  revalidatePath("/admin/accounting");
  revalidatePath("/admin/accounting/forecast");
  revalidatePath("/admin/settings");
}

export async function saveApprovalThresholds(formData: FormData) {
  const { supabase } = await requireAdmin();
  const thresholds = parseApprovalThresholds({
    invoice: Number(formData.get("invoice")),
    bill: Number(formData.get("bill")),
    purchaseOrder: Number(formData.get("purchaseOrder")),
  });
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: APPROVAL_THRESHOLDS_KEY,
      value: thresholds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
  revalidateFinance();
}

export async function closeAccountingMonth(formData: FormData) {
  const { supabase } = await requireAdmin();
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
    { key: MONTH_CLOSE_KEY, value: next, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
  revalidateFinance();
}

export async function reopenAccountingMonth(formData: FormData) {
  const { supabase } = await requireAdmin();
  const month = String(formData.get("month"));
  const existing = await loadMonthCloseMap();
  const next = { ...existing, [month]: { status: "open" as const, notes: existing[month]?.notes ?? null } };
  const { error } = await supabase.from("site_settings").upsert(
    { key: MONTH_CLOSE_KEY, value: next, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
  revalidateFinance();
}
