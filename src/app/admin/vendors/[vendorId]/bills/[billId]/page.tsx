import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BillEditForm,
  PayAchButton,
  RemitForm,
} from "@/components/vendors/VendorBillEditor";
import { formatMoney } from "@/lib/billing/constants";

export const dynamic = "force-dynamic";

export default async function VendorBillPage(props: {
  params: Promise<{ vendorId: string; billId: string }>;
}) {
  const { vendorId, billId } = await props.params;
  const admin = createAdminClient();

  const [{ data: bill }, { data: vendor }, { data: projects }] = await Promise.all([
    admin.from("vendor_bills").select("*").eq("id", billId).eq("vendor_id", vendorId).single(),
    admin.from("vendors").select("*").eq("id", vendorId).single(),
    admin.from("projects").select("id, title").neq("status", "archived").order("title"),
  ]);
  if (!bill || !vendor) notFound();

  // Two independent ways a vendor can be payable. Either we hold their banking
  // details, or Mercury already has them behind a recipient we've linked —
  // ensureVendorRecipient short-circuits on a stored recipient id and never
  // reads the account number, so a linked vendor needs nothing from us.
  const remitOnFile = Boolean(vendor.remit_account_number && vendor.remit_routing_number);
  const recipientLinked = Boolean(vendor.mercury_recipient_id);
  const payable = remitOnFile || recipientLinked;
  const isPaid = bill.status === "paid";
  const lineItems: { description: string; amount: number }[] = Array.isArray(bill.line_items)
    ? bill.line_items
    : [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/admin/vendors/${vendorId}`}
          className="text-[13px] font-medium app-muted hover:text-copper transition-colors"
        >
          ← {vendor.name}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="app-h1 !text-[20px]">
            {bill.bill_number ? `Invoice ${bill.bill_number}` : bill.title}
          </h2>
          <span
            className={`app-badge ${
              isPaid
                ? "app-badge-green"
                : bill.status === "void"
                  ? "app-badge-red"
                  : "app-badge-amber"
            }`}
          >
            {bill.status}
          </span>
          <span className="ml-auto text-xl font-semibold text-navy app-num">
            {formatMoney(Number(bill.amount))}
          </span>
        </div>
      </div>

      <div className="app-card p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="app-h2 !text-[16px]">
            {isPaid ? "Invoice (paid — edits update the record)" : "Edit invoice"}
          </h3>
          <a
            href={`/api/vendor-bills/${billId}/pdf`}
            className="app-btn app-btn-secondary !h-9"
          >
            <Download size={14} className="mr-1.5" />
            Download branded PDF
          </a>
        </div>
        <BillEditForm
          vendorId={vendorId}
          billId={billId}
          projects={projects ?? []}
          initial={{
            title: bill.title,
            bill_number: bill.bill_number,
            amount: Number(bill.amount),
            project_id: bill.project_id,
            issued_date: bill.issued_date,
            due_date: bill.due_date,
            notes: bill.notes,
            line_items: lineItems,
          }}
        />
      </div>

      {!isPaid && (
        <div className="app-card p-6">
          <h3 className="app-h2 !text-[15px]">Pay this invoice</h3>
          <p className="mt-1 mb-4 text-sm app-muted max-w-lg">
            Sends a Mercury ACH from the 8th Street operating account to {vendor.name}
            {remitOnFile
              ? "'s account on file"
              : recipientLinked
                ? "'s Mercury recipient"
                : ""}
            . The bill is marked paid automatically.
          </p>
          <PayAchButton
            vendorId={vendorId}
            billId={billId}
            amountLabel={formatMoney(Number(bill.amount))}
            vendorName={vendor.name}
            payable={payable}
          />
        </div>
      )}

      {isPaid && bill.mercury_transaction_id && (
        <div className="app-card p-6">
          <h3 className="app-h2 !text-[15px]">Payment</h3>
          <p className="mt-1 text-sm app-muted">
            Paid by Mercury ACH · transaction <span className="font-mono">{bill.mercury_transaction_id}</span>
            {bill.paid_at
              ? ` · ${new Date(bill.paid_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
              : ""}
          </p>
        </div>
      )}

      <details className="app-card p-6" open={!payable}>
        <summary className="cursor-pointer text-[15px] font-semibold text-navy">
          {vendor.name} payment details{" "}
          {remitOnFile
            ? "· on file ✓"
            : recipientLinked
              ? "· held by Mercury ✓"
              : "· needed for ACH"}
        </summary>
        <p className="mt-1 mb-4 text-sm app-muted max-w-lg">
          {recipientLinked && !remitOnFile
            ? "This vendor is already set up as a Mercury recipient, so we do not need their bank details here. Filling this in would store them a second time and reset the Mercury link."
            : "Stored securely in the database and used only for ACH payments. Changing them resets the Mercury recipient."}
        </p>
        <RemitForm
          vendorId={vendorId}
          initial={{
            address: vendor.address,
            remit_account_name: vendor.remit_account_name,
            remit_account_last4: vendor.remit_account_last4,
            remit_routing_number: vendor.remit_routing_number,
            remit_account_type: vendor.remit_account_type,
          }}
        />
      </details>
    </div>
  );
}
