import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PayInvoiceButton } from "@/components/billing/PayInvoiceButton";
import { formatMoney } from "@/lib/billing/constants";
import { computeBillingSummary } from "@/lib/billing/summary";
import { DRAW_STATUS_LABELS, DRAW_STATUS_STYLES, INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from "@/lib/project/labels";
import { stripeConfigured } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

export default async function ClientBillingPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await props.params;
  const { paid } = await props.searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, slug, contract_value")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const [{ data: draws }, { data: invoices }] = await Promise.all([
    supabase
      .from("payment_draws")
      .select("draw_number, title, description, amount, status, scheduled_date, percent_of_contract")
      .eq("project_id", id)
      .order("draw_number"),
    supabase
      .from("invoices")
      .select("id, invoice_number, title, status, total, due_date, paid_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const contractValue = Number(project.contract_value ?? 0);
  const drawList = draws ?? [];
  const summary = computeBillingSummary(contractValue, 0, drawList);
  const stripeReady = stripeConfigured();

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-3xl">
      <h2 className="font-display text-2xl md:text-3xl text-ink">Your payments</h2>
      <p className="mt-3 text-[15px] text-ink/60 leading-relaxed">
        This is the payment plan for <span className="text-ink font-medium">{project.title}</span>.
        You will receive an invoice after each major phase of construction.
      </p>

      {paid === "1" && (
        <div className="mt-8 p-5 border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm leading-relaxed">
          <strong>Thank you — payment received.</strong> It may take a moment for the status to
          update.
        </div>
      )}

      {summary.revisedContract > 0 && (
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="hub-panel p-5">
            <p className="eyebrow">Job total</p>
            <p className="font-display text-2xl text-ink mt-2">
              {formatMoney(summary.revisedContract)}
            </p>
          </div>
          <div className="hub-panel p-5">
            <p className="eyebrow">Paid so far</p>
            <p className="font-display text-2xl text-ink mt-2">{formatMoney(summary.paid)}</p>
          </div>
          <div className="hub-panel p-5 col-span-2 sm:col-span-1">
            <p className="eyebrow">Still owed</p>
            <p className="font-display text-2xl text-ink mt-2">{formatMoney(summary.balance)}</p>
          </div>
        </div>
      )}

      <section className="mt-12">
        <h3 className="font-display text-xl text-ink">Payment plan</h3>
        <p className="mt-1 text-sm text-ink/55 mb-6">
          Each row is a payment tied to progress on your home.
        </p>
        {drawList.length ? (
          <ol className="space-y-3">
            {drawList.map((d) => {
              const statusLabel = DRAW_STATUS_LABELS[d.status] ?? d.status;
              const statusStyle = DRAW_STATUS_STYLES[d.status] ?? DRAW_STATUS_STYLES.scheduled;
              return (
                <li key={d.draw_number} className="hub-panel p-5 flex flex-wrap justify-between gap-4">
                  <div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${statusStyle}`}
                    >
                      {statusLabel}
                    </span>
                    <p className="mt-2 font-medium text-ink">
                      Payment {d.draw_number}: {d.title}
                    </p>
                    {d.description && (
                      <p className="mt-1 text-sm text-ink/55">{d.description}</p>
                    )}
                  </div>
                  <p className="font-display text-xl text-ink shrink-0">
                    {formatMoney(Number(d.amount))}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="hub-panel py-12 text-center text-sm text-ink/50">
            Your builder has not set up the payment plan yet.
          </div>
        )}
      </section>

      <section className="mt-12">
        <h3 className="font-display text-xl text-ink">Invoices</h3>
        <p className="mt-1 text-sm text-ink/55 mb-6">Open invoices ready for payment.</p>
        <ul className="space-y-4">
          {(invoices ?? []).map((inv) => {
            const statusLabel = INVOICE_STATUS_LABELS[inv.status] ?? inv.status;
            const statusStyle = INVOICE_STATUS_STYLES[inv.status] ?? INVOICE_STATUS_STYLES.sent;
            return (
              <li key={inv.id} className="hub-panel p-6">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${statusStyle}`}
                    >
                      {statusLabel}
                    </span>
                    <p className="mt-2 font-mono text-xs text-stone-300">{inv.invoice_number}</p>
                    <p className="font-medium text-ink mt-1">{inv.title}</p>
                    <p className="font-display text-2xl text-ink mt-2">
                      {formatMoney(Number(inv.total))}
                    </p>
                    {inv.due_date && inv.status !== "paid" && (
                      <p className="text-xs text-stone-300 mt-2">Due {inv.due_date}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {inv.status !== "paid" && stripeReady && (
                      <PayInvoiceButton invoiceId={inv.id} />
                    )}
                    {inv.status !== "paid" && !stripeReady && (
                      <p className="text-sm text-ink/55 max-w-[200px] leading-relaxed">
                        Contact your builder to arrange payment by check or bank transfer.
                      </p>
                    )}
                    {inv.status === "paid" && (
                      <p className="text-sm text-emerald-700 font-medium mt-2">✓ Paid</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {!invoices?.length && (
            <li className="hub-panel py-12 text-center text-sm text-ink/50">
              No invoices yet. You will be notified when one is ready.
            </li>
          )}
        </ul>
      </section>

      <p className="mt-12 text-sm text-ink/45">
        Questions about a payment?{" "}
        <Link href={`/client/projects/${id}/messages`} className="text-copper hover:underline">
          Send a message
        </Link>{" "}
        to your builder.
      </p>
    </div>
  );
}
