import { formatMoney } from "@/lib/billing/constants";
import { mercuryPayUrl } from "@/lib/mercury/invoices";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from "@/lib/project/labels";
import { PayInvoiceButton } from "./PayInvoiceButton";

export type InvoiceCardData = {
  id: string;
  invoice_number: string;
  title: string | null;
  status: string;
  total: number;
  amount_paid?: number;
  due_date: string | null;
  paid_at?: string | null;
  created_at?: string;
  mercury_pay_slug?: string | null;
  mercury_status?: string | null;
  line_items?: { description: string; quantity: number; unit_amount: number; amount: number }[];
};

type InvoiceCardProps = {
  invoice: InvoiceCardData;
  variant: "admin" | "client";
  projectId?: string;
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
  const lineItems = invoice.line_items ?? [];

  return (
    <article className="group relative overflow-hidden border border-ink/10 bg-paper transition-shadow hover:shadow-[0_12px_40px_-24px_rgba(26,26,26,0.35)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-copper/80 via-copper/30 to-transparent" />

      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[11px] tracking-wider text-stone-400">
                {invoice.invoice_number}
              </span>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${statusStyle}`}
              >
                {statusLabel}
              </span>
              {invoice.mercury_status && invoice.mercury_status !== "Unpaid" && !isPaid && (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-violet-200 bg-violet-50 text-violet-700">
                  Mercury · {invoice.mercury_status}
                </span>
              )}
            </div>

            <h4 className="mt-3 font-display text-xl text-ink leading-snug">
              {invoice.title ?? "Invoice"}
            </h4>

            <p className="mt-3 font-display text-3xl md:text-4xl text-ink tracking-tight">
              {formatMoney(Number(invoice.total))}
            </p>

            {!isPaid && invoice.due_date && (
              <p className="mt-2 text-xs font-mono text-stone-400">
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
                    className="inline-flex h-11 items-center justify-center px-6 bg-ink text-bone font-mono text-[10px] tracking-[0.16em] uppercase hover:bg-copper transition-colors"
                  >
                    Pay via Mercury
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
          <div className="mt-6 pt-5 border-t border-ink/8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-3">
              Line items
            </p>
            <ul className="space-y-2">
              {lineItems.map((li, i) => (
                <li
                  key={i}
                  className="flex justify-between gap-4 text-sm text-ink/75 py-1.5 border-b border-ink/5 last:border-0"
                >
                  <span>{li.description}</span>
                  <span className="font-mono text-ink shrink-0">{formatMoney(Number(li.amount))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isPaid && variant === "admin" && mercuryUrl && (
          <div className="mt-5 pt-4 border-t border-ink/8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink/50">Mercury pay page — share with Habitat or homeowner</p>
            <a
              href={mercuryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] uppercase tracking-wider text-copper hover:underline"
            >
              Open pay link ↗
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
