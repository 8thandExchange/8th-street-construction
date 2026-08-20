import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Landmark } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { RecordBillForm, VendorLogoUpload } from "@/components/vendors/VendorForms";
import { SendVendorInvite } from "@/components/vendors/SendVendorInvite";
import { setVendorBillStatus, deleteVendorBill } from "@/lib/actions/vendors";
import {
  deleteVendorComplianceItem,
  saveVendorComplianceItem,
} from "@/lib/actions/vendor-compliance";
import { VENDOR_COMPLIANCE_KINDS } from "@/lib/vendors/compliance-kinds";
import { formatMoney } from "@/lib/billing/constants";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";
import { publicVendorLogo } from "@/lib/vendors/logos";

export const dynamic = "force-dynamic";

async function saveComplianceAction(formData: FormData) {
  "use server";
  await saveVendorComplianceItem(formData);
}

async function deleteComplianceAction(formData: FormData) {
  "use server";
  await deleteVendorComplianceItem(formData);
}

async function markPaidAction(formData: FormData) {
  "use server";
  await setVendorBillStatus(formData);
}

async function deleteBillAction(formData: FormData) {
  "use server";
  await deleteVendorBill(formData);
}

/**
 * Enough to confirm the right account is on file, not enough to use it.
 * Reads the plain *_last4 columns — the values themselves are encrypted and
 * this page never holds the key.
 */
const mask = (last4: string | null) => (last4 ? `•••• ${last4}` : null);

const fmt = (s: string | null) =>
  s
    ? new Date(`${s}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

export default async function VendorDetailPage(props: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await props.params;
  const admin = createAdminClient();

  const [{ data: vendor }, { data: bills }, { data: projects }, { data: complianceRows }] = await Promise.all([
    admin
      .from("vendors")
      .select(
        "id, name, logo_path, contact_email, phone, notes, legal_name, tax_id_last4, tax_classification, w9_path, onboarded_at, address, remit_account_number, remit_account_last4, remit_routing_number, remit_account_type, mercury_recipient_id"
      )
      .eq("id", vendorId)
      .single(),
    admin
      .from("vendor_bills")
      .select("id, bill_number, title, amount, status, issued_date, due_date, paid_at, file_path, project_id")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false }),
    admin
      .from("projects")
      .select("id, title")
      .neq("status", "archived")
      .order("title"),
    admin
      .from("vendor_compliance_items")
      .select("id, kind, label, expires_on, received_on, notes")
      .eq("vendor_id", vendorId)
      .order("expires_on", { ascending: true, nullsFirst: false }),
  ]);
  if (!vendor) notFound();

  let logoUrl: string | null = null;
  if (vendor.logo_path) {
    const { data: signed } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(vendor.logo_path, 3600);
    logoUrl = signed?.signedUrl ?? null;
  }
  if (!logoUrl) logoUrl = publicVendorLogo(vendor.name);

  const fileUrls = new Map<string, string>();
  for (const b of bills ?? []) {
    if (!b.file_path) continue;
    const { data: signed } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(b.file_path, 3600);
    if (signed?.signedUrl) fileUrls.set(b.id, signed.signedUrl);
  }

  const { data: openInvite } = await admin
    .from("vendor_invites")
    .select("email, expires_at, created_at")
    .eq("vendor_id", vendorId)
    .is("completed_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .maybeSingle();

  let w9Url: string | null = null;
  if (vendor.w9_path) {
    const { data: signed } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(vendor.w9_path, 3600);
    w9Url = signed?.signedUrl ?? null;
  }

  const projectTitles = new Map((projects ?? []).map((p) => [p.id, p.title]));
  const openTotal = (bills ?? [])
    .filter((b) => b.status === "open")
    .reduce((s, b) => s + Number(b.amount), 0);
  const paidTotal = (bills ?? [])
    .filter((b) => b.status === "paid")
    .reduce((s, b) => s + Number(b.amount), 0);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href="/admin/vendors"
          className="text-[13px] font-medium app-muted hover:text-copper transition-colors"
        >
          ← All vendors
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${vendor.name} logo`}
              className="h-16 w-16 rounded-xl border border-navy/10 bg-white object-contain p-1.5"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-navy/10 bg-navy/[0.03] text-navy/40">
              <Landmark size={26} strokeWidth={1.5} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="app-h1 !text-[22px]">{vendor.name}</h2>
            <p className="mt-1 text-sm app-muted">
              {[vendor.contact_email, vendor.phone].filter(Boolean).join(" · ") ||
                vendor.notes ||
                "Vendor"}
              {" · "}
              <VendorLogoUpload vendorId={vendor.id} hasLogo={Boolean(vendor.logo_path)} />
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-xl font-semibold app-num ${openTotal > 0 ? "text-amber-700" : "text-navy"}`}>
              {formatMoney(openTotal)}
            </p>
            <p className="text-[11px] uppercase tracking-wide app-muted">
              open · {formatMoney(paidTotal)} paid all-time
            </p>
          </div>
        </div>
      </div>

      <div className="app-card p-6 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="app-h2 !text-[16px]">Payment &amp; tax details</h3>
          {vendor.remit_account_number ? (
            <span className="app-badge app-badge-green">Ready to pay by ACH</span>
          ) : vendor.mercury_recipient_id ? (
            <span className="app-badge app-badge-green">Ready to pay by ACH · via Mercury</span>
          ) : openInvite ? (
            <span className="app-badge app-badge-amber">Waiting on {openInvite.email}</span>
          ) : (
            <span className="app-badge app-badge-neutral">Nothing on file</span>
          )}
        </div>

        {vendor.remit_account_number || vendor.tax_id_last4 ? (
          <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              ["Legal name", vendor.legal_name],
              ["Business type", vendor.tax_classification],
              ["Tax ID", mask(vendor.tax_id_last4)],
              ["Address", vendor.address],
              ["Routing number", vendor.remit_routing_number],
              ["Account number", mask(vendor.remit_account_last4)],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-[11px] uppercase tracking-wide app-muted">{label}</dt>
                  <dd className="mt-0.5 text-[14px] text-navy">{value}</dd>
                </div>
              ))}
          </dl>
        ) : (
          <p className="mt-4 text-[13px] leading-relaxed app-muted">
            Send them the setup form and they&apos;ll fill in their own address, tax ID, W-9 and
            bank details — no account numbers over email.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-navy/[0.06] pt-5">
          {w9Url && (
            <a
              href={w9Url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-copper hover:underline"
            >
              <FileText size={14} strokeWidth={1.75} />
              View W-9
            </a>
          )}
          {vendor.onboarded_at && (
            <span className="text-[12.5px] app-muted">
              Completed{" "}
              {new Date(vendor.onboarded_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] font-medium text-copper marker:text-copper/60">
            {openInvite
              ? "Re-send the setup form"
              : vendor.remit_account_number
                ? "Ask them to update their details"
                : "Send the setup form"}
          </summary>
          <div className="mt-4">
            <p className="mb-4 text-[12.5px] leading-relaxed app-muted">
              Sending a new link cancels any link they already have.
            </p>
            <SendVendorInvite
              vendor={{
                id: vendor.id,
                name: vendor.name,
                contactEmail: vendor.contact_email,
              }}
            />
          </div>
        </details>
      </div>

      <div className="app-card p-6">
        <h3 className="app-h2 !text-[16px] mb-1">Paperwork on file</h3>
        <p className="mb-4 text-sm app-muted">
          COIs, W-9s, licenses, lien waivers — with expiration dates so nothing lapses quietly.
        </p>
        {(complianceRows ?? []).length > 0 && (
          <ul className="mb-5 divide-y divide-navy/[0.06]">
            {(complianceRows ?? []).map((item) => {
              const days =
                item.expires_on == null
                  ? null
                  : Math.ceil(
                      (new Date(`${item.expires_on}T12:00:00`).getTime() - Date.now()) / 86400000
                    );
              const tone =
                days == null
                  ? "text-navy/50"
                  : days < 0
                    ? "text-red-700 font-medium"
                    : days <= 30
                      ? "text-amber-700 font-medium"
                      : "text-navy/50";
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <span className="min-w-0 flex-1 text-sm text-navy">
                    {item.label}
                    {item.notes && <span className="ml-2 text-xs app-muted">{item.notes}</span>}
                  </span>
                  <span className={`text-xs tabular-nums ${tone}`}>
                    {item.expires_on
                      ? days != null && days < 0
                        ? `Expired ${fmt(item.expires_on)}`
                        : `Expires ${fmt(item.expires_on)}${days != null && days <= 30 ? ` (${days}d)` : ""}`
                      : item.received_on
                        ? `Received ${fmt(item.received_on)}`
                        : "On file"}
                  </span>
                  <form action={deleteComplianceAction}>
                    <input type="hidden" name="vendor_id" value={vendor.id} />
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="text-xs text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <form action={saveComplianceAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <div>
            <label className="app-label">Kind</label>
            <select name="kind" className="mt-1">
              {VENDOR_COMPLIANCE_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="app-label">Label (optional)</label>
            <input name="label" placeholder="GL policy #4821" className="mt-1 w-full" />
          </div>
          <div>
            <label className="app-label">Received</label>
            <input type="date" name="received_on" className="mt-1" />
          </div>
          <div>
            <label className="app-label">Expires</label>
            <input type="date" name="expires_on" className="mt-1" />
          </div>
          <button type="submit" className="app-btn app-btn-secondary">
            Add
          </button>
        </form>
      </div>

      <div className="app-card divide-y divide-navy/[0.06]">
        {(bills ?? []).length === 0 && (
          <p className="p-8 text-sm italic app-muted">
            No bills recorded yet — add their first invoice below.
          </p>
        )}
        {(bills ?? []).map((bill) => (
          <div key={bill.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-5">
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/vendors/${vendor.id}/bills/${bill.id}`}
                className="block truncate text-[14.5px] font-medium text-navy hover:text-copper transition-colors"
              >
                {bill.title}
                {bill.bill_number ? (
                  <span className="ml-2 text-[12px] font-normal app-muted">#{bill.bill_number}</span>
                ) : null}
              </Link>
              <p className="mt-0.5 text-[12.5px] app-muted">
                {bill.project_id ? projectTitles.get(bill.project_id) ?? "Job" : "Company overhead"}
                {bill.issued_date ? ` · ${fmt(bill.issued_date)}` : ""}
                {bill.due_date && bill.status === "open" ? ` · due ${fmt(bill.due_date)}` : ""}
                {bill.status === "paid" && bill.paid_at
                  ? ` · paid ${new Date(bill.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : ""}
              </p>
            </div>
            {fileUrls.get(bill.id) && (
              <a
                href={fileUrls.get(bill.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-copper hover:underline"
              >
                <FileText size={13} /> Invoice
              </a>
            )}
            <span
              className={`text-[15px] font-semibold app-num ${
                bill.status === "open"
                  ? "text-amber-700"
                  : bill.status === "void"
                    ? "text-navy/35 line-through"
                    : "text-navy"
              }`}
            >
              {formatMoney(Number(bill.amount))}
            </span>
            {bill.status === "open" ? (
              <form action={markPaidAction}>
                <input type="hidden" name="bill_id" value={bill.id} />
                <input type="hidden" name="vendor_id" value={vendor.id} />
                <input type="hidden" name="status" value="paid" />
                <button type="submit" className="app-btn app-btn-primary !h-8 !px-3 !text-xs">
                  Mark paid
                </button>
              </form>
            ) : (
              <span
                className={`app-badge ${
                  bill.status === "paid"
                    ? "app-badge-green"
                    : bill.status === "void"
                      ? "app-badge-red"
                      : "app-badge-neutral"
                }`}
              >
                {bill.status}
              </span>
            )}
            <form action={deleteBillAction}>
              <input type="hidden" name="bill_id" value={bill.id} />
              <input type="hidden" name="vendor_id" value={vendor.id} />
              <button
                type="submit"
                className="text-xs text-red-700 hover:underline"
                title="Delete this bill record"
              >
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>

      <div className="app-card p-6 md:p-8">
        <h3 className="app-h2 !text-[16px] mb-1">Record a bill from {vendor.name}</h3>
        <p className="mb-5 text-sm app-muted">
          Enter their invoice as it arrives — attach the PDF so it&apos;s always findable.
        </p>
        <RecordBillForm vendorId={vendor.id} projects={projects ?? []} />
      </div>
    </div>
  );
}
