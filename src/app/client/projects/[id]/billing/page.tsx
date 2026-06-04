import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PayInvoiceButton } from "@/components/billing/PayInvoiceButton";
import { stripeConfigured } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

export default async function ClientBillingPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await props.params;
  const { paid } = await props.searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, title").eq("id", id).single();
  if (!project) notFound();

  const [{ data: draws }, { data: invoices }] = await Promise.all([
    supabase
      .from("payment_draws")
      .select("draw_number, title, amount, status, scheduled_date")
      .eq("project_id", id)
      .order("draw_number"),
    supabase
      .from("invoices")
      .select("id, invoice_number, title, status, total, due_date, paid_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-3xl">
      <h2 className="font-display text-xl text-ink mb-2">Billing</h2>
      <p className="mt-2 text-sm text-ink/60">Draw schedule and invoices for your project.</p>

      {paid === "1" && (
        <div className="mt-6 p-4 border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
          Payment received — thank you. It may take a moment to update status.
        </div>
      )}

      <section className="mt-10">
        <h2 className="eyebrow mb-4">Draw schedule</h2>
        <ul className="space-y-2">
          {(draws ?? []).map((d) => (
            <li key={d.draw_number} className="flex justify-between p-4 border border-ink/15 bg-paper text-sm">
              <span>
                Draw {d.draw_number}: {d.title}
              </span>
              <span className="font-mono">
                ${Number(d.amount).toLocaleString()} · {d.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-4">Invoices</h2>
        <ul className="space-y-4">
          {(invoices ?? []).map((inv) => (
            <li key={inv.id} className="p-6 border border-ink/15 bg-paper">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <div className="font-mono text-xs text-stone-300">{inv.invoice_number}</div>
                  <div className="font-medium text-ink mt-1">{inv.title}</div>
                  <div className="font-display text-xl mt-2">${Number(inv.total).toLocaleString()}</div>
                  {inv.due_date && (
                    <div className="text-xs text-stone-300 mt-1">Due {inv.due_date}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-wider">{inv.status}</span>
                  {inv.status !== "paid" && stripeConfigured() && (
                    <div className="mt-3">
                      <PayInvoiceButton invoiceId={inv.id} />
                    </div>
                  )}
                  {inv.status !== "paid" && !stripeConfigured() && (
                    <p className="mt-3 text-xs text-ink/50 max-w-[180px]">
                      Contact your project manager to arrange payment.
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
          {!invoices?.length && (
            <p className="text-ink/50 italic py-6 text-center border border-dashed border-ink/20">
              No invoices yet.
            </p>
          )}
        </ul>
      </section>
    </div>
  );
}
