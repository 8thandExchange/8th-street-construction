import Image from "next/image";
import { formatMoney } from "@/lib/billing/constants";
import { mercuryPayUrl } from "@/lib/mercury/invoices";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from "@/lib/project/labels";
import { PayInvoiceButton } from "./PayInvoiceButton";
import { InvoiceActions } from "./InvoiceActions";

export type InvoiceCardData = {
  id: string;
  invoice_number: string;
  title: string | null;
  status: string;
  total: number;
  amount_paid?: number;
  due_date?: string | null;
  paid_at?: string | null;
  created_at?: string;
  mercury_pay_slug?: string | null;
  mercury_status?: string | null;
  line_items?: { description: string; quantity: number; unit_amount: number; amount: number }[];
};

type InvoiceCardProps = {
  invoice: InvoiceCardData;
  variant: "admin" | "client";
  stripeReady?: boolean;
  markPaidAction?: React.ReactNode;
};

function formatDueDate(due: string | null) {
  if (!due) return null;
  const d = new Date(`${due}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function InvoiceCard({
  invoice,
  variant,
  stripeReady = false,
  markPaidAction,
}: InvoiceCardProps) {
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status;
  const statusStyle = INVOICE_STATUS_STYLES[invoice.status] ?? INVOICE_STATUS_STYLES.sent;
  const isPaid = invoice.status === "paid";
  const mercuryUrl = invoice.mercury_pay_slug ? mercuryPayUrl(invoice.mercury_pay_slug) : null;
  const pdfUrl = invoice.mercury_pay_slug ? `/api/invoices/${invoice.id}/mercury-pdf` : null;
  const lineItems = invoice.line_items ?? [];

  return (
    <article className="app-card app-card-hover group relative overflow-hidden">
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <Image
            src="/img/logo-icon.svg"
            alt=""
            width={28}
            height={28}
            className="opacity-35 shrink-0 mt-1"
            aria-hidden
          />
          <p className="app-label text-right">8th Street Construction</p>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="app-num text-xs app-muted">
                {invoice.invoice_number}
              </span>
              <span className={`app-badge ${isPaid ? "app-badge-green" : invoice.status === "overdue" ? "app-badge-red" : "app-badge-blue"}`}>
                {statusLabel}
              </span>
              {invoice.mercury_status && invoice.mercury_status !== "Unpaid" && !isPaid && (
                <span className="app-badge app-badge-neutral">Mercury · {invoice.mercury_status}</span>
              )}
            </div>

            <h4 className="mt-3 app-h2 !text-[16px] leading-snug">
              {invoice.title ?? "Invoice"}
            </h4>

            <p className="mt-3 app-num text-[28px] md:text-[32px] font-medium text-navy tracking-tight">
              {formatMoney(Number(invoice.total))}
            </p>

            {!isPaid && invoice.due_date && (
              <p className="mt-2 text-xs app-muted app-num">
                Due {formatDueDate(invoice.due_date)}
              </p>
            )}
            {isPaid && invoice.paid_at && (
              <p className="mt-2 text-xs text-emerald-700 font-medium">
                Paid {new Date(invoice.paid_at).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
            {!isPaid && variant === "client" && (
              <>
                {mercuryUrl && (
                  <a
                    href={mercuryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="app-btn app-btn-accent !h-10 !px-6"
                  >
                    Pay securely
                  </a>
                )}
                {stripeReady && <PayInvoiceButton invoiceId={invoice.id} variant="secondary" />}
                {!mercuryUrl && !stripeReady && (
                  <p className="text-sm text-ink/55 max-w-[220px] text-right leading-relaxed">
                    Contact your builder to arrange payment by check or bank transfer.
                  </p>
                )}
              </>
            )}

            {!isPaid && variant === "admin" && markPaidAction}
            {isPaid && (
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs">
                  ✓
                </span>
                Collected
              </div>
            )}
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="mt-5 pt-4 border-t border-navy/[0.07]">
            <p className="app-label mb-3">Line items</p>
            <ul className="space-y-2">
              {lineItems.map((li, i) => (
                <li
                  key={i}
                  className="flex justify-between gap-4 text-sm text-navy/80 py-1.5 border-b border-navy/[0.05] last:border-0"
                >
                  <span>{li.description}</span>
                  <span className="app-num text-navy shrink-0">{formatMoney(Number(li.amount))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(mercuryUrl || pdfUrl) && (
          <InvoiceActions
            mercuryPayUrl={mercuryUrl}
            pdfUrl={pdfUrl}
            variant={variant}
          />
        )}
      </div>
    </article>
  );
}
