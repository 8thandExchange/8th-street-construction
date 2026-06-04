import type { ComplianceSeedItem } from "./company-compliance-seed";

export type ComplianceRecord = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  jurisdiction: string | null;
  holder_name: string | null;
  policy_or_license_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  renewal_lead_days: number;
  renewal_urgent_days: number;
  renewal_cycle: string | null;
  status: string;
  notes: string | null;
};

export type ReminderTier = "early" | "urgent" | "expired";

export function daysUntilExpiry(expiresAt: string | null, today = new Date()): number | null {
  if (!expiresAt) return null;
  const exp = new Date(expiresAt + "T12:00:00");
  const t = new Date(today.toISOString().slice(0, 10) + "T12:00:00");
  return Math.ceil((exp.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeComplianceStatus(
  item: Pick<
    ComplianceRecord,
    "expires_at" | "renewal_lead_days" | "renewal_urgent_days" | "status"
  >,
  today = new Date()
): "active" | "expiring_soon" | "expired" | "pending" | "not_applicable" {
  if (item.status === "not_applicable") return "not_applicable";
  const days = daysUntilExpiry(item.expires_at, today);
  if (days === null) {
    return item.status === "pending" ? "pending" : "active";
  }
  if (days < 0) return "expired";
  if (days <= item.renewal_urgent_days) return "expiring_soon";
  if (days <= item.renewal_lead_days) return "expiring_soon";
  return "active";
}

export function reminderTierForItem(
  item: Pick<
    ComplianceRecord,
    "expires_at" | "renewal_lead_days" | "renewal_urgent_days"
  >,
  today = new Date()
): ReminderTier | null {
  const days = daysUntilExpiry(item.expires_at, today);
  if (days === null) return null;
  if (days < 0) return "expired";
  if (days <= item.renewal_urgent_days) return "urgent";
  if (days <= item.renewal_lead_days) return "early";
  return null;
}

export function formatExpiryMessage(item: ComplianceRecord, today = new Date()): string {
  const days = daysUntilExpiry(item.expires_at, today);
  if (days === null) return `${item.title} — no expiry date on file. Add dates to enable reminders.`;
  if (days < 0) return `${item.title} EXPIRED ${Math.abs(days)} day(s) ago — renew immediately.`;
  if (days === 0) return `${item.title} expires TODAY.`;
  return `${item.title} expires in ${days} day(s) (${item.expires_at}).`;
}

export function seedItemToRow(item: ComplianceSeedItem) {
  return {
    title: item.title,
    description: item.description ?? null,
    category: item.category,
    jurisdiction: item.jurisdiction,
    renewal_lead_days: item.renewal_lead_days ?? 60,
    renewal_urgent_days: item.renewal_urgent_days ?? 14,
    renewal_cycle: item.renewal_cycle ?? null,
    expires_at: item.expires_at ?? null,
    status: "pending" as const,
  };
}
