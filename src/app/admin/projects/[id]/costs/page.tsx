import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { HubPageHeader } from "@/components/hub/HubUI";
import { BudgetGrid } from "@/components/costs/BudgetGrid";
import { CostAttributionQueue } from "@/components/costs/CostAttributionQueue";
import { CostComparisonPanel } from "@/components/costs/CostComparisonPanel";
import { CostEstimateGenerator } from "@/components/costs/CostEstimateGenerator";
import { computeProjectCostSummary } from "@/lib/estimate/summary";
import { loadCostPlan } from "@/lib/estimate/cost-plan";
import { formatMoney } from "@/lib/billing/constants";
import { startCostPlanFromTemplate } from "@/lib/actions/cost-plan";
import { updateProjectEstimatedCost } from "@/lib/actions/estimate";

export const dynamic = "force-dynamic";

export default async function ProjectCostsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, slug, estimated_cost, contract_value, estimate_notes, square_footage, heated_square_footage")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { lines, takeoff, totals, rollup, attribution, uncoded } = await loadCostPlan(
    supabase,
    id,
    project
  );

  const costSummary = computeProjectCostSummary(
    Number(project.estimated_cost ?? 0),
    Number(project.contract_value ?? 0),
    lines.map((l) => ({
      id: l.id,
      division_code: l.code ?? "",
      trade_label: l.trade_label,
      description: null,
      estimated_amount: Number(l.estimated_amount ?? 0),
      awarded_amount: l.awarded_amount == null ? null : Number(l.awarded_amount),
      bid_request_id: null,
    }))
  );

  const { data: templates } = await supabase
    .from("cost_code_templates")
    .select("id, name, description, is_default")
    .order("is_default", { ascending: false })
    .order("name");

  return (
    <div className="max-w-6xl">
      <HubPageHeader
        title="Our cost plan"
        description="What this house costs us to build. Calculated lines re-figure from the takeoff — this is separate from what you bill the client."
      />

      <CostComparisonPanel projectId={id} summary={costSummary} compact />

      {lines.length === 0 ? (
        <>
          {(templates ?? []).length > 0 && (
            <div className="hub-panel p-6 mb-6 border-copper/20">
              <h3 className="font-medium text-ink">Start from a template</h3>
              <p className="text-sm text-ink/55 mt-2 leading-relaxed">
                Copies the standard code list and takeoff into this job. Every line and quantity is
                editable afterward.
              </p>
              <div className="mt-5 space-y-3">
                {(templates ?? []).map((t) => (
                  <form key={t.id} action={startCostPlanFromTemplate} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="template_id" value={t.id} />
                    <button type="submit" className="app-btn app-btn-accent">
                      Use “{t.name}”
                    </button>
                    {t.description && <span className="text-xs text-ink/45">{t.description}</span>}
                  </form>
                ))}
              </div>
            </div>
          )}
          <CostEstimateGenerator projectId={id} />
        </>
      ) : (
        <section className="mb-12">
          <CostAttributionQueue projectId={id} lines={lines} uncoded={uncoded} />

          <BudgetGrid
            projectId={id}
            lines={lines}
            takeoff={takeoff}
            totals={totals}
            rollup={rollup}
            attribution={attribution}
          />

          <p className="text-xs text-ink/45 mt-4 leading-relaxed">
            Click a code to open a line — formula, notes and allowance live there. Calculated cells
            show a <span className="text-copper">ƒ</span> and are priced from the takeoff.
          </p>
        </section>
      )}

      <section className="hub-panel p-6">
        <h3 className="eyebrow mb-4">Notes on this estimate</h3>
        <form action={updateProjectEstimatedCost} className="flex flex-wrap gap-4 items-end">
          <input type="hidden" name="project_id" value={id} />
          <div className="flex-1 min-w-[16rem]">
            <label className="field-label">Estimate notes</label>
            <input
              type="text"
              name="estimate_notes"
              defaultValue={project.estimate_notes ?? ""}
              className="field-input"
              placeholder="Assumptions, exclusions, who quoted what"
            />
          </div>
          <button type="submit" className="app-btn app-btn-primary">
            Save notes
          </button>
        </form>
        <p className="text-xs text-ink/45 mt-3">
          Total build cost is {formatMoney(totals.total)}. Client billing (
          {formatMoney(Number(project.contract_value ?? 0)) || "not set"}) is managed in{" "}
          <Link href={`/admin/projects/${id}/billing`} className="text-copper hover:underline">
            Money &amp; Invoices
          </Link>
          .
        </p>
      </section>

      <div className="mt-10 flex items-center gap-6">
        <Link href={`/admin/projects/${id}`} className="app-label !text-copper hover:underline">
          ← Back to master board
        </Link>
        <Link href="/admin/settings/cost-codes" className="app-label !text-ink/45 hover:!text-copper hover:underline">
          Edit cost code template
        </Link>
      </div>
    </div>
  );
}
