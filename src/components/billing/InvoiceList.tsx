import { markInvoicePaid } from "@/lib/actions/billing";
import { formatMoney } from "@/lib/billing/constants";
import type { InvoiceRecord } from "@/lib/billing/summary";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from "@/lib/project/labels";

type InvoiceListProps = {
  projectId: string;
  invoices: InvoiceRecord[];
};

export function InvoiceList({ projectId, invoices }: InvoiceListProps) {
  return (
    <section>
      <h3 className="font-display text-xl text-ink mb-1">Invoices</h3>
      <p className="text-sm text-ink/55 mb-6">Every invoice you have sent for this job.</p>

      {!invoices.length ? (
        <div className="hub-panel text-center py-12 px-6">
          <p className="text-ink/50 text-sm">No invoices yet.</p>
          <p className="text-ink/40 text-xs mt-2">
            Send one from the payment schedule when a build phase is done.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {invoices.map((inv) => {
            const statusLabel = INVOICE_STATUS_LABELS[inv.status] ?? inv.status;
            const statusStyle = INVOICE_STATUS_STYLES[inv.status] ?? INVOICE_STATUS_STYLES.sent;

            return (
              <li
                key={inv.id}
                className="hub-panel p-5 md:p-6 flex flex-wrap justify-between gap-4 items-start"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-stone-300">{inv.invoice_number}</span>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${statusStyle}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-ink font-medium">{inv.title}</p>
                  <p className="font-display text-2xl text-ink mt-2">
                    {formatMoney(Number(inv.total))}
                  </p>
                  {inv.due_date && inv.status !== "paid" && (
                    <p className="text-xs text-stone-300 mt-2">Due {inv.due_date}</p>
                  )}
                  {inv.paid_at && (
                    <p className="text-xs text-emerald-700 mt-2">
                      Paid {new Date(inv.paid_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {inv.status !== "paid" && inv.status !== "void" && (
                  <form
                    action={async (fd) => {
                      "use server";
                      await markInvoicePaid(fd);
                    }}
                  >
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="invoice_id" value={inv.id} />
                    <button
                      type="submit"
                      className="h-10 px-4 border border-ink/20 text-ink font-mono text-[10px] tracking-[0.14em] uppercase hover:bg-ink hover:text-bone transition-colors"
                    >
                      Mark as paid
                    </button>
                    <p className="text-[10px] text-ink/45 mt-2 max-w-[9rem] text-right leading-relaxed">
                      Use when Habitat sends a check
                    </p>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
