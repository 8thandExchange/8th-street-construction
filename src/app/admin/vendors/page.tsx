import Link from "next/link";
import { Landmark } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AddVendorForm } from "@/components/vendors/VendorForms";
import { formatMoney } from "@/lib/billing/constants";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";
import { publicVendorLogo } from "@/lib/vendors/logos";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const admin = createAdminClient();
  const [{ data: vendors }, { data: bills }] = await Promise.all([
    admin.from("vendors").select("id, name, logo_path, contact_email, notes").order("name"),
    admin.from("vendor_bills").select("vendor_id, amount, status"),
  ]);

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
                <span className="block truncate text-[12.5px] app-muted">
                  {v.notes || v.contact_email || "—"}
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
        <h3 className="app-h2 !text-[16px] mb-5">Add a vendor</h3>
        <AddVendorForm />
      </div>
    </div>
  );
}
