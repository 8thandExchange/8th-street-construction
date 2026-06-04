import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import {
  computeComplianceStatus,
  formatExpiryMessage,
  reminderTierForItem,
  type ComplianceRecord,
  type ReminderTier,
} from "./compliance-utils";

function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";

async function getAdminEmails(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("role", "admin");
  const emails = (data ?? []).map((p) => p.email).filter(Boolean) as string[];
  if (emails.length) return emails;
  return [process.env.EMAIL_TO_LEADS || "hello@8thstreetconstruction.com"];
}

async function alreadySent(
  admin: ReturnType<typeof createAdminClient>,
  itemId: string,
  tier: ReminderTier,
  expiresAt: string | null
) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data } = await admin
    .from("compliance_reminder_log")
    .select("id, days_until_expiry")
    .eq("compliance_item_id", itemId)
    .eq("reminder_tier", tier)
    .gte("sent_at", since.toISOString())
    .order("sent_at", { ascending: false })
    .limit(5);

  if (!data?.length) return false;
  const days = expiresAt
    ? Math.ceil(
        (new Date(expiresAt + "T12:00:00").getTime() - Date.now()) / 86400000
      )
    : null;
  return data.some((l) => l.days_until_expiry === days);
}

export async function runComplianceReminders(options?: { dryRun?: boolean }) {
  const admin = createAdminClient();
  const { data: items } = await admin.from("company_compliance_items").select("*");

  if (!items?.length) {
    return { sent: 0, skipped: 0, message: "No compliance items." };
  }

  const recipients = await getAdminEmails(admin);
  const client = resend();
  const today = new Date();
  let sent = 0;
  let skipped = 0;

  for (const raw of items) {
    const item = raw as ComplianceRecord;
    const status = computeComplianceStatus(item, today);
    if (status === "not_applicable") continue;

    await admin
      .from("company_compliance_items")
      .update({ status })
      .eq("id", item.id);

    const tier = reminderTierForItem(item, today);
    if (!tier) continue;

    if (await alreadySent(admin, item.id, tier, item.expires_at)) {
      skipped++;
      continue;
    }

    if (options?.dryRun || !client) {
      skipped++;
      continue;
    }

    const subject =
      tier === "expired"
        ? `URGENT: Compliance expired — ${item.title}`
        : tier === "urgent"
          ? `Action needed: ${item.title} expires soon`
          : `Reminder: ${item.title} renewal coming up`;

    const body = formatExpiryMessage(item, today);
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

    await client.emails.send({
      from: FROM,
      to: recipients,
      subject,
      html: `<p>${body}</p><p><a href="${site}/admin/compliance">Open Company Compliance →</a></p>`,
      text: body,
    });

    const daysUntil = item.expires_at
      ? Math.ceil(
          (new Date(item.expires_at + "T12:00:00").getTime() - today.getTime()) / 86400000
        )
      : null;

    await admin.from("compliance_reminder_log").insert({
      compliance_item_id: item.id,
      reminder_tier: tier,
      sent_to: recipients.join(", "),
      days_until_expiry: daysUntil,
    });

    sent++;
  }

  return { sent, skipped, recipients };
}

export async function getComplianceDashboardAlerts() {
  const admin = createAdminClient();
  const { data: items } = await admin.from("company_compliance_items").select("*");
  const today = new Date();
  const alerts: (ComplianceRecord & { tier: ReminderTier | null; days: number | null })[] =
    [];

  for (const raw of items ?? []) {
    const item = raw as ComplianceRecord;
    const status = computeComplianceStatus(item, today);
    const tier = reminderTierForItem(item, today);
    if (status === "expired" || tier) {
      alerts.push({
        ...item,
        status,
        tier,
        days: item.expires_at
          ? Math.ceil(
              (new Date(item.expires_at + "T12:00:00").getTime() - today.getTime()) /
                86400000
            )
          : null,
      });
    }
  }

  alerts.sort((a, b) => {
    if (a.status === "expired" && b.status !== "expired") return -1;
    if (b.status === "expired" && a.status !== "expired") return 1;
    return (a.days ?? 999) - (b.days ?? 999);
  });

  return alerts;
}
