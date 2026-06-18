import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BillingBrandHeader } from "@/components/billing/BillingBrandHeader";
import { HabitatProjectBanner } from "@/components/billing/HabitatProjectBanner";
import { BillingSetupWizard } from "@/components/billing/BillingSetupWizard";
import { BillingMetricsRow } from "@/components/billing/BillingMetricsRow";
import { BillingStatusBanner } from "@/components/billing/BillingStatusBanner";
import { DrawTimeline } from "@/components/billing/DrawTimeline";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { updateContractValue, createDraw } from "@/lib/actions/billing";
import { isHabitat608Project } from "@/lib/billing/constants";
import {
  computeBillingSummary,
  getBillingSetupStep,
  type DrawRecord,
  type InvoiceRecord,
} from "@/lib/billing/summary";
import { mercuryConfigured } from "@/lib/mercury/config";
import { syncProjectMercuryInvoices } from "@/lib/mercury/sync";
import { stripeConfigured } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

async function loadInvoiceLineItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceIds: string[]
) {
  if (!invoiceIds.length) return new Map<string, InvoiceRecord["line_items"]>();

  const { data: items } = await supabase
    .from("invoice_line_items")
    .select("invoice_id, description, quantity, unit_amount, amount, display_order")
    .in("invoice_id", invoiceIds)
    .order("display_order");

  const map = new Map<string, NonNullable<InvoiceRecord["line_items"]>>();
  for (const row of items ?? []) {
    const list = map.get(row.invoice_id) ?? [];
    list.push({
      description: row.description,
      quantity: Number(row.quantity),
      unit_amount: Number(row.unit_amount),
      amount: Number(row.amount),
    });
    map.set(row.invoice_id, list);
  }
  return map;
}

export default async function ProjectBillingPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  await syncProjectMercuryInvoices(id);

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, slug, contract_value, client_id")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const [{ data: draws }, { data: invoices }, { data: changeOrders }, clientRes] =
    await Promise.all([
      supabase
        .from("payment_draws")
        .select(
          "id, draw_number, title, description, amount, percent_of_contract, status, scheduled_date, invoice_id"
        )
        .eq("project_id", id)
        .order("draw_number"),
      supabase
        .from("invoices")
        .select(
          "id, invoice_number, title, status, total, amount_paid, due_date, paid_at, created_at, mercury_pay_slug, mercury_status"
        )
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("change_orders")
        .select("cost_impact, status")
        .eq("project_id", id),
      project.client_id
        ? supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("id", project.client_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

  const lineItemMap = await loadInvoiceLineItems(
    supabase,
    (invoices ?? []).map((i) => i.id)
  );

  const changeOrderTotal = (changeOrders ?? [])
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + Number(c.cost_impact ?? 0), 0);

  const contractValue = Number(project.contract_value ?? 0);
  const drawList = (draws ?? []) as DrawRecord[];
  const invoiceList: InvoiceRecord[] = (invoices ?? []).map((inv) => ({
    ...(inv as InvoiceRecord),
    line_items: lineItemMap.get(inv.id),
  }));

  const summary = computeBillingSummary(contractValue, changeOrderTotal, drawList);
  const setupStep = getBillingSetupStep(contractValue, drawList.length);
  const isHabitat = isHabitat608Project(project.slug);
  const stripeReady = stripeConfigured();
  const mercuryReady = mercuryConfigured();

  const clientName = clientRes.data
    ? [clientRes.data.first_name, clientRes.data.last_name].filter(Boolean).join(" ") ||
      clientRes.data.email
    : null;

  return (
    <div className="max-w-4xl">
      <BillingBrandHeader
        eyebrow="Client invoices"
        title="Progress billing"
        projectTitle={project.title}
        description="What Habitat or the homeowner pays you — synced with Mercury for secure ACH and card payments."
      />

      <BillingStatusBanner stripeReady={stripeReady} mercuryReady={mercuryReady} variant="admin" />

      {isHabitat && <HabitatProjectBanner projectId={id} />}

      <BillingSetupWizard
        projectId={id}
        projectSlug={project.slug}
        projectTitle={project.title}
        step={setupStep}
        contractValue={contractValue}
        drawCount={drawList.length}
        clientId={project.client_id}
        clientName={clientName}
        stripeReady={stripeReady}
        mercuryReady={mercuryReady}
      />

      {setupStep !== 1 && (
        <>
          <BillingMetricsRow summary={summary} />

          {setupStep !== 2 && (
            <>
              <DrawTimeline projectId={id} draws={drawList} />
              <InvoiceList projectId={id} invoices={invoiceList} />
            </>
          )}
        </>
      )}

      {contractValue > 0 && (
        <details className="mt-12 hub-panel p-5">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-stone-300">
            Adjust contract amount
          </summary>
          <form
            action={async (fd) => {
              "use server";
              await updateContractValue(fd);
            }}
            className="mt-5 flex flex-wrap gap-3 items-end"
          >
            <input type="hidden" name="project_id" value={id} />
            <input type="hidden" name="auto_seed_draws" value="off" />
            <div>
              <label className="field-label">Contract value ($)</label>
              <input
                type="number"
                name="contract_value"
                step="1"
                defaultValue={contractValue}
                className="field-input w-40"
                required
              />
            </div>
            <button
              type="submit"
              className="h-10 px-4 bg-ink text-bone font-mono text-[10px] uppercase"
            >
              Update
            </button>
          </form>
          <p className="mt-3 text-xs text-ink/45">
            Changing the total does not update existing payment amounts. Edit draws individually
            below if needed.
          </p>
        </details>
      )}

      {drawList.length > 0 && (
        <details className="mt-4 hub-panel p-5">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-stone-300">
            Add a one-time payment
          </summary>
          <form
            action={async (fd) => {
              "use server";
              await createDraw(fd);
            }}
            className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <input type="hidden" name="project_id" value={id} />
            <input
              name="title"
              placeholder="What is this payment for?"
              required
              className="field-input sm:col-span-2"
            />
            <input
              name="description"
              placeholder="Short note (optional)"
              className="field-input sm:col-span-2"
            />
            <input type="number" name="amount" placeholder="Amount ($)" required className="field-input" />
            <input type="date" name="scheduled_date" className="field-input" />
            <button
              type="submit"
              className="sm:col-span-2 h-10 px-4 bg-ink text-bone font-mono text-[10px] uppercase w-fit"
            >
              Add payment
            </button>
          </form>
        </details>
      )}

      <div className="mt-10 pt-8 border-t border-ink/10 flex flex-wrap gap-4 text-sm">
        <Link
          href={`/admin/projects/${id}`}
          className="text-copper hover:underline font-mono text-[10px] uppercase tracking-wider"
        >
          ← Back to Job Home
        </Link>
        <Link
          href={`/admin/projects/${id}/overview`}
          className="text-stone-300 hover:text-ink font-mono text-[10px] uppercase tracking-wider"
        >
          Job Details
        </Link>
        {project.client_id && (
          <Link
            href={`/client/projects/${id}/billing`}
            target="_blank"
            className="text-stone-300 hover:text-ink font-mono text-[10px] uppercase tracking-wider"
          >
            Preview client billing ↗
          </Link>
        )}
      </div>
    </div>
  );
}
