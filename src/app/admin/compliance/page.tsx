import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  seedCompanyCompliance,
  syncComplianceStatuses,
  triggerComplianceReminders,
  upsertComplianceItem,
  deleteComplianceItem,
} from "@/lib/actions/compliance";
import {
  computeComplianceStatus,
  daysUntilExpiry,
} from "@/lib/compliance/compliance-utils";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  active: "border-green-200 text-green-800 bg-green-50",
  expiring_soon: "border-amber-200 text-amber-900 bg-amber-50",
  expired: "border-red-300 text-red-800 bg-red-50",
  pending: "border-ink/20 text-ink/70 bg-bone",
  not_applicable: "border-ink/10 text-ink/40",
};

export default async function CompanyCompliancePage() {
  await syncComplianceStatuses();

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("company_compliance_items")
    .select("*")
    .order("category")
    .order("title");

  const today = new Date();
  const rows = (items ?? []).map((item) => ({
    ...item,
    computed: computeComplianceStatus(item, today),
    days: daysUntilExpiry(item.expires_at, today),
  }));

  const expired = rows.filter((r) => r.computed === "expired").length;
  const expiring = rows.filter((r) => r.computed === "expiring_soon").length;

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl">
      <div className="mb-10">
        <span className="eyebrow">— Company</span>
        <h1 className="mt-2 app-h1">Compliance & Renewals</h1>
        <p className="mt-3 text-ink/65 max-w-2xl leading-relaxed">
          Licenses, insurance, bonds, and registrations for 8th Street Construction across Georgia
          and South Carolina. Set expiry dates — the system emails admins on a daily schedule at 60,
          14, and 0 days (and after expiration) so renewals are proactive, not reactive.
        </p>
      </div>

      {(expired > 0 || expiring > 0) && (
        <div className="mb-8 p-6 border border-amber-300/50 bg-amber-50/80">
          <div className="font-medium text-ink">
            {expired > 0 && (
              <span className="text-red-700">{expired} expired</span>
            )}
            {expired > 0 && expiring > 0 && " · "}
            {expiring > 0 && (
              <span className="text-amber-900">{expiring} need attention soon</span>
            )}
          </div>
          <p className="text-sm text-ink/60 mt-2">
            Daily cron at 8:00 AM ET sends reminder emails when items enter the renewal window.
            Add <code className="text-xs">CRON_SECRET</code> in Vercel for the scheduled job.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-10">
        {(items ?? []).length === 0 && (
          <form
            action={async () => {
              "use server";
              await seedCompanyCompliance();
            }}
          >
            <button
              type="submit"
              className="app-btn app-btn-accent"
            >
              Initialize GA + SC Checklist
            </button>
          </form>
        )}
        <form
          action={async () => {
            "use server";
            await triggerComplianceReminders();
          }}
        >
          <button
            type="submit"
            className="h-11 px-5 app-btn app-btn-secondary"
          >
            Send Reminders Now
          </button>
        </form>
        <Link
          href="/admin"
          className="h-11 inline-flex items-center px-5 font-mono text-[10px] tracking-[0.2em] uppercase text-stone-300"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="space-y-4 mb-12">
        {rows.map((item) => (
          <details key={item.id} className="border border-ink/15 bg-paper group">
            <summary className="cursor-pointer p-5 flex flex-wrap items-center justify-between gap-3 list-none">
              <div>
                <div className="font-medium text-ink">{item.title}</div>
                <div className="text-xs font-mono text-stone-300 mt-1">
                  {item.category}
                  {item.jurisdiction && ` · ${item.jurisdiction}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.days != null && (
                  <span className="text-xs font-mono text-stone-300">
                    {item.days < 0
                      ? `${Math.abs(item.days)}d overdue`
                      : item.days === 0
                        ? "Today"
                        : `${item.days}d left`}
                  </span>
                )}
                <span
                  className={`app-badge border !text-[11px] ${STATUS_STYLES[item.computed] ?? STATUS_STYLES.pending}`}
                >
                  {item.computed.replace("_", " ")}
                </span>
              </div>
            </summary>
            <div className="px-5 pb-5 border-t border-ink/10 pt-5">
              {item.description && (
                <p className="text-sm text-ink/60 mb-4">{item.description}</p>
              )}
              <form
                action={async (fd) => {
                  "use server";
                  await upsertComplianceItem(fd);
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="title" value={item.title} />
                <input type="hidden" name="description" value={item.description ?? ""} />
                <input type="hidden" name="category" value={item.category} />
                <input type="hidden" name="jurisdiction" value={item.jurisdiction ?? ""} />
                <div>
                  <label className="field-label">Holder / carrier</label>
                  <input
                    name="holder_name"
                    defaultValue={item.holder_name ?? ""}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Policy / license #</label>
                  <input
                    name="policy_or_license_number"
                    defaultValue={item.policy_or_license_number ?? ""}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Issued</label>
                  <input
                    type="date"
                    name="issued_at"
                    defaultValue={item.issued_at ?? ""}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Expires *</label>
                  <input
                    type="date"
                    name="expires_at"
                    defaultValue={item.expires_at ?? ""}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Early reminder (days)</label>
                  <input
                    type="number"
                    name="renewal_lead_days"
                    defaultValue={item.renewal_lead_days}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Urgent window (days)</label>
                  <input
                    type="number"
                    name="renewal_urgent_days"
                    defaultValue={item.renewal_urgent_days}
                    className="field-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Notes</label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={item.notes ?? ""}
                    className="field-input"
                  />
                </div>
                <input type="hidden" name="renewal_cycle" value={item.renewal_cycle ?? ""} />
                <button
                  type="submit"
                  className="h-10 px-4 app-btn app-btn-primary"
                >
                  Save & Recalculate Status
                </button>
              </form>
              <form
                action={async (fd) => {
                  "use server";
                  await deleteComplianceItem(fd);
                }}
                className="mt-4"
              >
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  className="text-[10px] font-mono uppercase text-red-600/70 hover:text-red-700"
                >
                  Remove item
                </button>
              </form>
            </div>
          </details>
        ))}
      </div>

      <section className="border border-ink/15 p-8 bg-paper">
        <h2 className="app-h2 !text-[16px] mb-4">Add compliance item</h2>
        <form
          action={async (fd) => {
            "use server";
            await upsertComplianceItem(fd);
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <label className="field-label">Title *</label>
            <input name="title" className="field-input" required />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Description</label>
            <textarea name="description" rows={2} className="field-input" />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select name="category" className="field-input" defaultValue="other">
              {[
                "license",
                "insurance",
                "bond",
                "registration",
                "certification",
                "tax",
                "safety",
                "other",
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Jurisdiction</label>
            <input name="jurisdiction" className="field-input" placeholder="Georgia" />
          </div>
          <div>
            <label className="field-label">Expires</label>
            <input type="date" name="expires_at" className="field-input" />
          </div>
          <div>
            <label className="field-label">Early reminder (days)</label>
            <input
              type="number"
              name="renewal_lead_days"
              defaultValue={60}
              className="field-input"
            />
          </div>
          <input type="hidden" name="renewal_urgent_days" value={14} />
          <button
            type="submit"
            className="h-11 px-5 app-btn app-btn-primary"
          >
            Add Item
          </button>
        </form>
      </section>
    </div>
  );
}
