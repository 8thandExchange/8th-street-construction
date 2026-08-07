import Link from "next/link";
import { Landmark } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AddVendorForm } from "@/components/vendors/VendorForms";
import { SendVendorInvite } from "@/components/vendors/SendVendorInvite";
import { formatMoney } from "@/lib/billing/constants";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";
import { publicVendorLogo } from "@/lib/vendors/logos";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const admin = createAdminClient();
  const [{ data: vendors }, { data: bills }, { data: invites }] = await Promise.all([
    admin
      .from("vendors")
      .select("id, name, logo_path, contact_email, notes, onboarded_at, remit_account_number")
      .order("name"),
    admin.from("vendor_bills").select("vendor_id, amount, status"),
    admin
      .from("vendor_invites")
      .select("vendor_id, expires_at")
      .is("completed_at", null)
      .is("revoked_at", null),
  ]);

  const now = Date.now();
  const awaitingVendors = new Set(
    (invites ?? [])
      .filter((i) => new Date(i.expires_at).getTime() > now)
      .map((i) => i.vendor_id)
  );

  const logoUrls = new Map<string, string>();
  for (const v of vendors ?? []) {
    if (v.logo_path) {
      const { data: signed } = await admin.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(v.logo_path, 3600);
      if (signed?.signedUrl) {
        logoUrls.set(v.id, signed.signedUrl);
        continue;
      }
    }
    const fallback = publicVendorLogo(v.name);
    if (fallback) logoUrls.set(v.id, fallback);
  }

  const openByVendor = new Map<string, number>();
  const paidByVendor = new Map<string, number>();
  for (const b of bills ?? []) {
    if (b.status === "open") {
      openByVendor.set(b.vendor_id, (openByVendor.get(b.vendor_id) ?? 0) + Number(b.amount));
    } else if (b.status === "paid") {
      paidByVendor.set(b.vendor_id, (paidByVendor.get(b.vendor_id) ?? 0) + Number(b.amount));
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">Money</p>
        <h2 className="mt-2 app-h1">Vendors &amp; Bills</h2>
        <p className="mt-2 text-sm text-ink/60 max-w-2xl leading-relaxed">
          The companies that bill you — consultants, suppliers, service providers. Record their
          invoices here, tie them to jobs, and track what&apos;s owed.
        </p>
      </div>

      <div className="app-card divide-y divide-navy/[0.06]">
        {(vendors ?? []).length === 0 && (
          <p className="p-8 text-sm italic app-muted">No vendors yet — add the first one below.</p>
        )}
        {(vendors ?? []).map((v) => {
          const open = openByVendor.get(v.id) ?? 0;
          const logo = logoUrls.get(v.id);
          return (
            <Link
              key={v.id}
              href={`/admin/vendors/${v.id}`}
              className="flex items-center gap-4 p-5 transition-colors hover:bg-navy/[0.02]"
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={`${v.name} logo`}
                  className="h-11 w-11 shrink-0 rounded-lg border border-navy/10 bg-white object-contain p-1"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-navy/10 bg-navy/[0.03] text-navy/40">
                  <Landmark size={18} strokeWidth={1.5} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-navy">{v.name}</span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="min-w-0 truncate text-[12.5px] app-muted">
                    {v.notes || v.contact_email || "—"}
                  </span>
                  {v.remit_account_number ? (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                      ACH ready
                    </span>
                  ) : awaitingVendors.has(v.id) ? (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                      Form sent
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-navy/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-navy/50">
                      No bank info
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={`block text-[15px] font-semibold tabular-nums ${
                    open > 0 ? "text-amber-700" : "text-navy/60"
                  }`}
                >
                  {formatMoney(open)}
                </span>
                <span className="block text-[11px] uppercase tracking-wide app-muted">
                  {open > 0 ? "open" : "settled"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="app-card p-6 md:p-8">
        <h3 className="app-h2 !text-[16px]">Add a vendor &amp; send them the form</h3>
        <p className="mt-1.5 mb-5 max-w-xl text-[13px] leading-relaxed text-ink/55">
          They get a private link and fill in their own address, tax ID, W-9 and bank details.
          Nothing sensitive travels by email, and they&apos;re ready to pay by ACH the moment
          they&apos;re done.
        </p>
        <SendVendorInvite />
      </div>

      <details className="app-card p-6 md:p-8">
        <summary className="cursor-pointer app-h2 !text-[16px] marker:text-copper">
          Or add a vendor by hand
        </summary>
        <p className="mt-1.5 mb-5 text-[13px] leading-relaxed text-ink/55">
          For vendors you won&apos;t pay by ACH, or when you already have their paperwork.
        </p>
        <AddVendorForm />
      </details>
    </div>
  );
}
