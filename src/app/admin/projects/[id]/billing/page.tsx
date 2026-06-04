import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  updateContractValue,
  seedDrawSchedule,
  createDraw,
  createInvoiceFromDraw,
  markInvoicePaid,
} from "@/lib/actions/billing";
import { stripeConfigured } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

export default async function ProjectBillingPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, contract_value, client_id")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const [{ data: draws }, { data: invoices }] = await Promise.all([
    supabase
      .from("payment_draws")
      .select("*, invoices(id, invoice_number, status, stripe_hosted_invoice_url)")
      .eq("project_id", id)
      .order("draw_number"),
    supabase
      .from("invoices")
      .select("id, invoice_number, title, status, total, amount_paid, due_date, paid_at, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const contract = Number(project.contract_value ?? 0);
  const invoiced = (draws ?? [])
    .filter((d) => d.status === "invoiced" || d.status === "paid")
    .reduce((s, d) => s + Number(d.amount), 0);
  const paid = (draws ?? [])
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl text-ink mb-2">Billing & Draws</h2>
      <p className="text-sm text-ink/60 mb-6">
        Draw schedule tied to construction progress. Generate invoices and collect via Stripe
        {stripeConfigured() ? " (connected)" : " (add STRIPE_SECRET_KEY to enable payments)"}.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-5 border border-ink/15 bg-paper">
          <div className="eyebrow">Contract</div>
          <div className="font-display text-2xl mt-1">${contract.toLocaleString()}</div>
        </div>
        <div className="p-5 border border-ink/15 bg-paper">
          <div className="eyebrow">Invoiced</div>
          <div className="font-display text-2xl mt-1">${invoiced.toLocaleString()}</div>
        </div>
        <div className="p-5 border border-ink/15 bg-paper">
          <div className="eyebrow">Paid</div>
          <div className="font-display text-2xl mt-1">${paid.toLocaleString()}</div>
        </div>
      </div>

      <form
        action={async (fd) => {
          "use server";
          await updateContractValue(fd);
        }}
        className="flex flex-wrap gap-3 items-end p-5 border border-ink/15 bg-paper mb-6"
      >
        <input type="hidden" name="project_id" value={id} />
        <div>
          <label className="field-label">Contract value ($)</label>
          <input
            type="number"
            name="contract_value"
            step="0.01"
            defaultValue={contract || ""}
            className="field-input w-40"
            required
          />
        </div>
        <button type="submit" className="h-10 px-4 bg-ink text-bone font-mono text-[10px] uppercase">
          Save
        </button>
        {(draws ?? []).length === 0 && contract > 0 && (
          <button
            formAction={async (fd) => {
              "use server";
              await seedDrawSchedule(fd);
            }}
            className="h-10 px-4 border border-copper text-copper font-mono text-[10px] uppercase"
          >
            Seed 5-draw schedule
          </button>
        )}
      </form>

      <h3 className="eyebrow mb-4">Draw schedule</h3>
      <ul className="space-y-3 mb-10">
        {(draws ?? []).map((d) => (
          <li key={d.id} className="p-5 border border-ink/15 bg-paper">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-stone-300">Draw {d.draw_number}</div>
                <div className="font-medium text-ink">{d.title}</div>
                <div className="text-sm font-mono mt-1">${Number(d.amount).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-300">
                  {d.status}
                </span>
                {d.scheduled_date && (
                  <div className="text-xs text-stone-300 mt-1">Due {d.scheduled_date}</div>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.status === "scheduled" && (
                <form
                  action={async (fd) => {
                    "use server";
                    await createInvoiceFromDraw(fd);
                  }}
                >
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="draw_id" value={d.id} />
                  <button
                    type="submit"
                    className="h-9 px-4 bg-copper text-bone font-mono text-[10px] uppercase"
                  >
                    Create & Send Invoice
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      <details className="mb-10 border border-ink/15 p-5 bg-paper">
        <summary className="cursor-pointer font-mono text-[10px] uppercase text-stone-300">
          Add custom draw
        </summary>
        <form
          action={async (fd) => {
            "use server";
            await createDraw(fd);
          }}
          className="mt-4 grid grid-cols-2 gap-3"
        >
          <input type="hidden" name="project_id" value={id} />
          <input name="title" placeholder="Title" required className="field-input col-span-2" />
          <input type="number" name="amount" placeholder="Amount" required className="field-input" />
          <input type="date" name="scheduled_date" className="field-input" />
          <button type="submit" className="col-span-2 h-9 px-4 bg-ink text-bone font-mono text-[10px] uppercase w-fit">
            Add Draw
          </button>
        </form>
      </details>

      <h3 className="eyebrow mb-4">Invoices</h3>
      <ul className="space-y-3">
        {(invoices ?? []).map((inv) => (
          <li key={inv.id} className="p-5 border border-ink/15 bg-paper flex justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-stone-300">{inv.invoice_number}</div>
              <div className="text-sm text-ink">{inv.title}</div>
              <div className="font-display text-lg mt-1">${Number(inv.total).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase">{inv.status}</span>
              {inv.status !== "paid" && (
                <form
                  action={async (fd) => {
                    "use server";
                    await markInvoicePaid(fd);
                  }}
                  className="mt-2"
                >
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="invoice_id" value={inv.id} />
                  <button type="submit" className="text-[10px] font-mono uppercase text-stone-300 hover:text-ink">
                    Mark paid (manual)
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
