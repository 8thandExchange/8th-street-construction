import { markInvoicePaid, sendCustomInvoice } from "@/lib/actions/billing";
import type { InvoiceRecord } from "@/lib/billing/summary";
import { InvoiceCard, type InvoiceCardData } from "./InvoiceCard";

type InvoiceListProps = {
  projectId: string;
  invoices: InvoiceRecord[];
};

export function InvoiceList({ projectId, invoices }: InvoiceListProps) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display text-xl md:text-2xl text-ink">Invoices</h3>
          <p className="mt-1 text-sm text-ink/55">
            Every invoice sent for this job — synced with Mercury when connected.
          </p>
        </div>
        {invoices.length > 0 && (
          <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
            {invoices.filter((i) => i.status === "paid").length} of {invoices.length} collected
          </p>
        )}
      </div>

      {!invoices.length ? (
        <div className="hub-panel text-center py-14 px-6 border-dashed border-ink/15">
          <p className="font-display text-lg text-ink/70">No invoices yet</p>
          <p className="text-ink/45 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            Send one from the payment schedule, or create a custom invoice below.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {invoices.map((inv) => (
            <li key={inv.id}>
              <InvoiceCard
                invoice={inv as InvoiceCardData}
                variant="admin"
                markPaidAction={
                  inv.status === "draft" ? (
                    <form
                      action={async (fd) => {
                        "use server";
                        await sendCustomInvoice(fd);
                      }}
                    >
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="invoice_id" value={inv.id} />
                      <button
                        type="submit"
                        className="h-10 px-4 bg-copper text-bone font-mono text-[10px] tracking-[0.14em] uppercase hover:bg-copper-400 transition-colors"
                      >
                        Send invoice
                      </button>
                      <p className="text-[10px] text-ink/45 mt-2 max-w-[9rem] text-right leading-relaxed">
                        Draft — not sent yet
                      </p>
                    </form>
                  ) : inv.status !== "paid" && inv.status !== "void" ? (
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
                        Check received
                      </p>
                    </form>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
