import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BillingBrandHeader } from "@/components/billing/BillingBrandHeader";
import { BillingProgressHero } from "@/components/billing/BillingProgressHero";
import { BillingStatusBanner } from "@/components/billing/BillingStatusBanner";
import { InvoiceCard, type InvoiceCardData } from "@/components/billing/InvoiceCard";
import { formatMoney } from "@/lib/billing/constants";
import { computeBillingSummary } from "@/lib/billing/summary";
import { DRAW_STATUS_LABELS, DRAW_STATUS_STYLES } from "@/lib/project/labels";
import { syncProjectMercuryInvoices } from "@/lib/mercury/sync";
import { stripeConfigured } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

export default async function ClientBillingPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await props.params;
  const { paid } = await props.searchParams;
  const supabase = await createClient();

  await syncProjectMercuryInvoices(id);

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
      .select(
        "id, invoice_number, title, status, total, due_date, paid_at, mercury_pay_slug, mercury_status"
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const invoiceIds = (invoices ?? []).map((i) => i.id);
  const { data: lineItems } = invoiceIds.length
    ? await supabase
        .from("invoice_line_items")
        .select("invoice_id, description, quantity, unit_amount, amount, display_order")
        .in("invoice_id", invoiceIds)
        .order("display_order")
    : { data: [] };

  const lineItemMap = new Map<string, InvoiceCardData["line_items"]>();
  for (const row of lineItems ?? []) {
    const list = lineItemMap.get(row.invoice_id) ?? [];
    list.push({
      description: row.description,
      quantity: Number(row.quantity),
      unit_amount: Number(row.unit_amount),
      amount: Number(row.amount),
    });
    lineItemMap.set(row.invoice_id, list);
  }

  const contractValue = Number(project.contract_value ?? 0);
  const drawList = draws ?? [];
  const summary = computeBillingSummary(contractValue, 0, drawList);
  const stripeReady = stripeConfigured();

  const openInvoices = (invoices ?? []).filter((i) => i.status !== "paid").length;

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-3xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors mb-6 inline-block"
      >
        ← Overview
      </Link>
      <BillingBrandHeader
        eyebrow="Your billing"
        title="Your payments"
        projectTitle={project.title}
        description="Invoices arrive after each major construction phase. Pay securely online or review your payment plan below."
      />

      {paid === "1" && (
        <div className="mt-8 p-5 border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm leading-relaxed">
          <strong>Thank you — payment received.</strong> It may take a moment for the status to
          update.
        </div>
      )}

      <div className="mt-8">
        <BillingStatusBanner stripeReady={stripeReady} variant="client" />
      </div>

      <BillingProgressHero projectTitle={project.title} summary={summary} />

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display text-xl text-ink">Payment plan</h3>
            <p className="mt-1 text-sm text-ink/55">
              Each draw is tied to progress on your home.
            </p>
          </div>
        </div>
        {drawList.length ? (
          <ol className="space-y-3">
            {drawList.map((d) => {
              const statusLabel = DRAW_STATUS_LABELS[d.status] ?? d.status;
              const statusStyle = DRAW_STATUS_STYLES[d.status] ?? DRAW_STATUS_STYLES.scheduled;
              return (
                <li
                  key={d.draw_number}
                  className="hub-panel p-5 md:p-6 flex flex-wrap justify-between gap-4 border-l-4 border-l-copper/40"
                >
                  <div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${statusStyle}`}
                    >
                      {statusLabel}
                    </span>
                    <p className="mt-2 font-medium text-ink text-lg">
                      Draw {d.draw_number}: {d.title}
                    </p>
                    {d.description && (
                      <p className="mt-1 text-sm text-ink/55 leading-relaxed">{d.description}</p>
                    )}
                  </div>
                  <p className="font-display text-2xl text-ink shrink-0">
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

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display text-xl md:text-2xl text-ink">Invoices</h3>
            <p className="mt-1 text-sm text-ink/55">
              {openInvoices > 0
                ? `${openInvoices} open invoice${openInvoices === 1 ? "" : "s"} ready for payment`
                : "All caught up — no open invoices"}
            </p>
          </div>
        </div>
        <ul className="space-y-4">
          {(invoices ?? []).map((inv) => (
            <li key={inv.id}>
              <InvoiceCard
                invoice={{
                  ...inv,
                  line_items: lineItemMap.get(inv.id),
                }}
                variant="client"
                stripeReady={stripeReady}
              />
            </li>
          ))}
          {!invoices?.length && (
            <li className="hub-panel py-14 text-center text-sm text-ink/50 border-dashed border-ink/15">
              No invoices yet. You will be notified when one is ready.
            </li>
          )}
        </ul>
      </section>

      <p className="mt-14 text-sm text-ink/45">
        Questions about a payment?{" "}
        <Link href={`/client/projects/${id}/messages`} className="text-copper hover:underline">
          Send a message
        </Link>{" "}
        to your builder.
      </p>
    </div>
  );
}
