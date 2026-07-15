import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  deleteDraftInvoice,
  markInvoicePaid,
  sendCustomInvoice,
} from "@/lib/actions/billing";
import { EditDraftInvoiceForm } from "@/components/billing/EditDraftInvoiceForm";
import { appStatusBadge } from "@/lib/project/status-badges";
import { INVOICE_STATUS_LABELS } from "@/lib/project/labels";
import { formatMoney } from "@/lib/billing/constants";
import { mercuryPayUrl } from "@/lib/mercury/invoices";

export const dynamic = "force-dynamic";

async function sendInvoiceAction(formData: FormData) {
  "use server";
  await sendCustomInvoice(formData);
}

async function markPaidAction(formData: FormData) {
  "use server";
  await markInvoicePaid(formData);
}

async function deleteDraftAction(formData: FormData) {
  "use server";
  const projectId = String(formData.get("project_id"));
  await deleteDraftInvoice(formData);
  redirect(`/admin/projects/${projectId}/billing`);
}

const fmt = (s: string | null | undefined) =>
  s
    ? new Date(s.length <= 10 ? `${s}T12:00:00` : s).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

export default async function InvoiceDetailPage(props: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = await props.params;
  const supabase = await createClient();

  const [{ data: invoice }, { data: lines }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, title, status, subtotal, total, amount_paid, due_date, notes, sent_at, paid_at, created_at, mercury_pay_slug, mercury_status, project:projects(title)"
      )
      .eq("id", invoiceId)
      .eq("project_id", id)
      .single(),
    supabase
      .from("invoice_line_items")
      .select("description, quantity, unit_amount, amount")
      .eq("invoice_id", invoiceId)
      .order("display_order"),
  ]);
  if (!invoice) notFound();

  const project = Array.isArray(invoice.project) ? invoice.project[0] : invoice.project;
  const isDraft = invoice.status === "draft";
  const isPaid = invoice.status === "paid";
  const payUrl = invoice.mercury_pay_slug ? mercuryPayUrl(invoice.mercury_pay_slug) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/admin/projects/${id}/billing`}
          className="text-[13px] font-medium app-muted hover:text-copper transition-colors"
        >
          ← All invoices for {project?.title ?? "this job"}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="app-h1 !text-[20px]">{invoice.invoice_number}</h2>
          <span className={appStatusBadge("invoice", invoice.status)}>
            {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
          </span>
          <span className="ml-auto text-xl font-semibold text-navy tabular-nums">
            {formatMoney(Number(invoice.total))}
          </span>
        </div>
        <p className="mt-1 text-sm app-muted">
          {invoice.title}
          {invoice.sent_at ? ` · Sent ${fmt(invoice.sent_at)}` : " · Draft — the client has NOT seen this"}
          {invoice.due_date ? ` · Due ${fmt(invoice.due_date)}` : ""}
          {isPaid && invoice.paid_at ? ` · Paid ${fmt(invoice.paid_at)}` : ""}
        </p>
      </div>

      {isDraft ? (
        <>
          <div className="app-card p-6 md:p-8">
            <h3 className="app-h2 !text-[16px] mb-5">Edit draft</h3>
            <EditDraftInvoiceForm
              projectId={id}
              invoiceId={invoiceId}
              initial={{
                title: invoice.title ?? "",
                due_date: invoice.due_date,
                notes: invoice.notes,
                line_items: (lines ?? []).map((li) => ({
                  description: li.description,
                  quantity: Number(li.quantity),
                  unit_amount: Number(li.unit_amount),
                })),
              }}
            />
          </div>

          <div className="app-card p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="app-h2 !text-[15px]">Ready to bill?</h3>
              <p className="mt-1 text-sm app-muted max-w-md">
                Sending pushes the invoice to Mercury and emails the client an ACH pay link. Save
                any edits above first.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <form action={deleteDraftAction}>
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="invoice_id" value={invoiceId} />
                <button
                  type="submit"
                  className="app-btn app-btn-ghost hover:!text-red-600"
                >
                  Delete draft
                </button>
              </form>
              <form action={sendInvoiceAction}>
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="invoice_id" value={invoiceId} />
                <button type="submit" className="app-btn app-btn-accent">
                  Send to client
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        <div className="app-card p-6 md:p-8">
          <p className="app-label mb-3">Line items</p>
          <ul className="divide-y divide-navy/[0.06]">
            {(lines ?? []).map((li, i) => (
              <li key={i} className="flex justify-between gap-4 py-2.5 text-sm text-navy/80">
                <span>
                  {li.description}
                  {Number(li.quantity) !== 1 ? ` × ${Number(li.quantity)}` : ""}
                </span>
                <span className="tabular-nums text-navy shrink-0">
                  {formatMoney(Number(li.amount))}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end text-sm">
            <span className="font-semibold text-navy tabular-nums">
              Total {formatMoney(Number(invoice.total))}
            </span>
          </div>
          {invoice.notes && (
            <p className="mt-4 text-sm app-muted">Notes: {invoice.notes}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {payUrl && (
              <a href={payUrl} target="_blank" rel="noopener noreferrer" className="app-btn app-btn-secondary !h-9">
                Mercury pay page
              </a>
            )}
            {invoice.mercury_pay_slug && (
              <a
                href={`/api/invoices/${invoice.id}/mercury-pdf`}
                target="_blank"
                className="app-btn app-btn-secondary !h-9"
              >
                PDF
              </a>
            )}
            {!isPaid && invoice.status !== "void" && (
              <form action={markPaidAction}>
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="invoice_id" value={invoiceId} />
                <button type="submit" className="app-btn app-btn-primary !h-9">
                  Mark as paid
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
