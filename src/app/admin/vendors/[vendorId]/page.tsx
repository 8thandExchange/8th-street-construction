import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Landmark } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { RecordBillForm, VendorLogoUpload } from "@/components/vendors/VendorForms";
import { setVendorBillStatus, deleteVendorBill } from "@/lib/actions/vendors";
import { formatMoney } from "@/lib/billing/constants";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";
import { publicVendorLogo } from "@/lib/vendors/logos";

export const dynamic = "force-dynamic";

async function markPaidAction(formData: FormData) {
  "use server";
  await setVendorBillStatus(formData);
}

async function deleteBillAction(formData: FormData) {
  "use server";
  await deleteVendorBill(formData);
}

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

  const [{ data: vendor }, { data: bills }, { data: projects }] = await Promise.all([
    admin
      .from("vendors")
      .select("id, name, logo_path, contact_email, phone, notes")
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
            <p className={`text-xl font-semibold tabular-nums ${openTotal > 0 ? "text-amber-700" : "text-navy"}`}>
              {formatMoney(openTotal)}
            </p>
            <p className="text-[11px] uppercase tracking-wide app-muted">
              open · {formatMoney(paidTotal)} paid all-time
            </p>
          </div>
        </div>
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
              className={`text-[15px] font-semibold tabular-nums ${
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
                <button type="submit" className="app-btn app-btn-primary !h-8 !px-3">
                  Mark paid
                </button>
              </form>
            ) : (
              <span className="text-[11px] font-medium uppercase tracking-wide app-muted">
                {bill.status}
              </span>
            )}
            <form action={deleteBillAction}>
              <input type="hidden" name="bill_id" value={bill.id} />
              <input type="hidden" name="vendor_id" value={vendor.id} />
              <button
                type="submit"
                className="text-[12px] app-muted hover:text-red-600 transition-colors"
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
