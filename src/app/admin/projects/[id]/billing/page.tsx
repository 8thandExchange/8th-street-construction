import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BillingBrandHeader } from "@/components/billing/BillingBrandHeader";
import { HabitatProjectBanner } from "@/components/billing/HabitatProjectBanner";
import { BillingSetupWizard } from "@/components/billing/BillingSetupWizard";
import { BillingMetricsRow } from "@/components/billing/BillingMetricsRow";
import { BillingStatusBanner } from "@/components/billing/BillingStatusBanner";
import { NoticeToProceedCard } from "@/components/billing/NoticeToProceedCard";
import { DrawTimeline } from "@/components/billing/DrawTimeline";
import { CustomInvoiceForm } from "@/components/billing/CustomInvoiceForm";
import { InvoiceBuilderDropzone } from "@/components/billing/InvoiceBuilderDropzone";
import { CityBudgetCard, type CityBudgetRow } from "@/components/billing/CityBudgetCard";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { updateContractValue, createDraw } from "@/lib/actions/billing";
import { isHabitat608Project } from "@/lib/billing/constants";
import { isHabitatProject } from "@/lib/project/funding";
import {
  computeBillingSummary,
  getBillingSetupStep,
  type DrawRecord,
  type InvoiceRecord,
} from "@/lib/billing/summary";
import { mercuryConfigured } from "@/lib/mercury/config";
import { syncProjectMercuryInvoices } from "@/lib/mercury/sync";
import { SubmitButton } from "@/components/admin/SubmitButton";

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
    .select(
      "id, title, slug, contract_value, client_id, funding_type, estimated_cost, notice_to_proceed_at, notice_to_proceed_note"
    )
    .eq("id", id)
    .single();

  if (!project) notFound();

  const [
    { data: draws },
    { data: invoices },
    { data: changeOrders },
    { data: budgetLines },
    { data: billedLineItems },
    clientRes,
  ] = await Promise.all([
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
      supabase
        .from("city_budget_lines")
        .select("id, city_number, description, budget_amount")
        .eq("project_id", id)
        .order("city_number"),
      supabase
        .from("invoice_line_items")
        .select(
          "city_budget_line_id, amount, invoice:invoices!inner(status, total, amount_paid, project_id)"
        )
        .eq("invoice.project_id", id)
        .not("city_budget_line_id", "is", null),
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
  const isHabitat = isHabitatProject(project);
  const mercuryReady = mercuryConfigured();

  const clientName = clientRes.data
    ? [clientRes.data.first_name, clientRes.data.last_name].filter(Boolean).join(" ") ||
      clientRes.data.email
    : null;

  // Paid per city budget line — only money actually collected counts.
  // Partial payments count pro-rata: each line takes its share of amount_paid.
  const billedByBudgetLine = new Map<string, number>();
  for (const row of billedLineItems ?? []) {
    const inv = Array.isArray(row.invoice) ? row.invoice[0] : row.invoice;
    if (!row.city_budget_line_id || !inv || inv.status === "draft" || inv.status === "void") {
      continue;
    }
    const total = Number(inv.total);
    const paidFraction =
      inv.status === "paid"
        ? 1
        : total > 0
          ? Math.min(1, Number(inv.amount_paid ?? 0) / total)
          : 0;
    if (paidFraction <= 0) continue;
    billedByBudgetLine.set(
      row.city_budget_line_id,
      (billedByBudgetLine.get(row.city_budget_line_id) ?? 0) +
        Math.round(Number(row.amount) * paidFraction * 100) / 100
    );
  }
  const cityBudgetRows: CityBudgetRow[] = (budgetLines ?? []).map((line) => ({
    id: line.id,
    city_number: line.city_number,
    description: line.description,
    budget_amount: Number(line.budget_amount),
    billed: billedByBudgetLine.get(line.id) ?? 0,
  }));

  return (
    <div className="max-w-4xl">
      <BillingBrandHeader
        eyebrow="Client invoices"
        title="Progress billing"
        projectTitle={project.title}
        description="What Habitat or the homeowner pays you — synced with Mercury for secure ACH bank transfer."
      />

      <BillingStatusBanner mercuryReady={mercuryReady} variant="admin" />

      <NoticeToProceedCard projectId={id} project={project} />

      {isHabitat && (
        <HabitatProjectBanner projectId={id} estimatedCost={Number(project.estimated_cost ?? 0)} />
      )}

      {/* Progress invoices lead the page — what has been billed and paid is
          the first thing to see. Never hidden behind billing setup: if any
          exist (e.g. a draft made before the draw schedule), they must be
          findable. */}
      {(invoiceList.length > 0 || (setupStep !== 1 && setupStep !== 2)) && (
        <InvoiceList projectId={id} invoices={invoiceList} />
      )}

      <InvoiceBuilderDropzone projectId={id} />

      <CustomInvoiceForm
        projectId={id}
        projectTitle={project.title}
        clientName={clientName}
        budgetLines={(budgetLines ?? []).map((l) => ({
          id: l.id,
          city_number: l.city_number,
          description: l.description,
        }))}
      />

      {isHabitat && (
        <CityBudgetCard
          projectId={id}
          rows={cityBudgetRows}
          is608Macon={isHabitat608Project(project.slug ?? "")}
        />
      )}

      <BillingSetupWizard
        projectId={id}
        projectSlug={project.slug}
        fundingType={project.funding_type}
        projectTitle={project.title}
        step={setupStep}
        contractValue={contractValue}
        drawCount={drawList.length}
        clientId={project.client_id}
        clientName={clientName}
        mercuryReady={mercuryReady}
      />

      {setupStep !== 1 && (
        <>
          <BillingMetricsRow summary={summary} />

          {setupStep !== 2 && (
            <>
              <DrawTimeline projectId={id} draws={drawList} />
              {drawList.length > 0 && (
                <div className="mt-4 app-card flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-[13px] font-semibold text-navy">
                      {isHabitat ? "HUD draw packet" : "Draw packet"}
                    </p>
                    <p className="mt-0.5 text-[12px] app-muted">
                      AIA G702/G703-format payment application
                      {isHabitat && " — the format Augusta requires for HOME fund draws"}.
                    </p>
                  </div>
                  <Link
                    href={`/print/draw-packet/${id}`}
                    target="_blank"
                    className="app-btn app-btn-primary !h-9 shrink-0 !px-4 !text-xs"
                  >
                    Generate packet
                  </Link>
                </div>
              )}
            </>
          )}
        </>
      )}

      {contractValue > 0 && (
        <details className="mt-12 hub-panel p-5">
          <summary className="cursor-pointer text-[13px] font-medium text-copper">
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
            <SubmitButton>Update</SubmitButton>
          </form>
          <p className="mt-3 text-xs app-muted">
            Changing the total does not update existing payment amounts. Edit draws individually
            below if needed.
          </p>
        </details>
      )}

      {drawList.length > 0 && (
        <details className="mt-4 hub-panel p-5">
          <summary className="cursor-pointer text-[13px] font-medium text-copper">
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
            <SubmitButton className="sm:col-span-2 app-btn app-btn-primary">
              Add payment
            </SubmitButton>
          </form>
        </details>
      )}

      <div className="mt-10 pt-8 border-t border-ink/10 flex flex-wrap gap-4 text-sm">
        <Link
          href={`/admin/projects/${id}`}
          className="text-[13px] font-medium text-copper hover:underline"
        >
          ← Back to Job Home
        </Link>
        <Link
          href={`/admin/projects/${id}/overview`}
          className="text-[13px] font-medium app-muted hover:text-copper"
        >
          Job Details
        </Link>
        {project.client_id && (
          <Link
            href={`/client/projects/${id}/billing`}
            target="_blank"
            className="text-[13px] font-medium app-muted hover:text-copper"
          >
            Preview client billing ↗
          </Link>
        )}
      </div>
    </div>
  );
}
