import { createClient } from "@/lib/supabase/server";
import {
  parseApprovalThresholds,
  type ApprovalThresholds,
} from "@/lib/finance/thresholds";

export const APPROVAL_THRESHOLDS_KEY = "approval_thresholds";
export const MONTH_CLOSE_KEY = "month_close";

export type MonthCloseRecord = {
  status: "open" | "closed";
  closed_at?: string | null;
  notes?: string | null;
};

export async function loadApprovalThresholds(): Promise<ApprovalThresholds> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", APPROVAL_THRESHOLDS_KEY)
    .maybeSingle();
  return parseApprovalThresholds(data?.value);
}

export async function loadMonthCloseMap(): Promise<Record<string, MonthCloseRecord>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", MONTH_CLOSE_KEY)
    .maybeSingle();
  const value = data?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, MonthCloseRecord>;
}
