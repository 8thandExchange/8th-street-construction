import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { HubPageHeader } from "@/components/hub/HubUI";
import { CostComparisonPanel } from "@/components/costs/CostComparisonPanel";
import { computeProjectCostSummary } from "@/lib/estimate/summary";
import { formatMoney } from "@/lib/billing/constants";
import {
  importMacon608Estimate,
  updateEstimateLine,
  updateProjectEstimatedCost,
} from "@/lib/actions/estimate";
import { isHabitat608Project } from "@/lib/billing/constants";
import { MACON_608_ESTIMATE_META } from "@/lib/estimate/divisions";

export const dynamic = "force-dynamic";

export default async function ProjectCostsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, slug, estimated_cost, contract_value, estimate_notes")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: lines } = await supabase
    .from("project_estimate_lines")
    .select(
      "id, division_code, trade_label, description, estimated_amount, awarded_amount, bid_request_id, notes"
    )
    .eq("project_id", id)
    .order("display_order");

  const lineList = lines ?? [];
  const isHabitat = isHabitat608Project(project.slug);
  const costSummary = computeProjectCostSummary(
    Number(project.estimated_cost ?? 0),
    Number(project.contract_value ?? 0),
    lineList
  );

  return (
    <div className="max-w-4xl">
      <HubPageHeader
        title="Our cost plan"
        description="What we think it costs to build this house. Update as sub quotes come in — this is separate from what you bill the client."
      />

      <CostComparisonPanel projectId={id} summary={costSummary} compact />

      {lineList.length === 0 && isHabitat && (
        <div className="hub-panel p-6 mb-10 border-copper/20">
          <h3 className="font-medium text-ink">Import 608 Macon permit-set estimate</h3>
          <p className="text-sm text-ink/55 mt-2 leading-relaxed">
            Starts at ~{formatMoney(MACON_608_ESTIMATE_META.directCostTotal)} direct costs (
            {MACON_608_ESTIMATE_META.source}). You&apos;ll refine each trade as real quotes arrive.
          </p>
          <form action={importMacon608Estimate} className="mt-5">
            <input type="hidden" name="project_id" value={id} />
            <button
              type="submit"
              className="h-11 px-6 bg-copper text-bone font-mono text-[10px] uppercase tracking-wider"
            >
              Import cost plan from permit set
            </button>
          </form>
        </div>
      )}

      {lineList.length > 0 && (
        <section className="mb-12">
          <h3 className="font-display text-xl text-ink mb-1">Line by line</h3>
          <p className="text-sm text-ink/55 mb-6">
            Our guess vs what subs actually quoted. Green means the quote came in under our plan.
          </p>
          <div className="border border-ink/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bone/60 text-left text-[10px] font-mono uppercase text-stone-300">
                  <th className="px-4 py-3">Trade</th>
                  <th className="px-4 py-3 text-right">Our plan</th>
                  <th className="px-4 py-3 text-right">Sub quote</th>
                  <th className="px-4 py-3 text-right">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {lineList.map((line) => {
                  const est = Number(line.estimated_amount);
                  const award = line.awarded_amount != null ? Number(line.awarded_amount) : null;
                  const diff = award != null ? est - award : null;
                  return (
                    <tr key={line.id} className="bg-paper">
                      <td className="px-4 py-4">
                        <div className="font-medium text-ink">{line.trade_label}</div>
                        <div className="text-xs text-stone-300 mt-0.5">{line.division_code}</div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono">{formatMoney(est)}</td>
                      <td className="px-4 py-4 text-right font-mono">
                        {award != null ? formatMoney(award) : "—"}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-mono ${
                          diff != null
                            ? diff >= 0
                              ? "text-emerald-700"
                              : "text-red-700"
                            : "text-stone-300"
                        }`}
                      >
                        {diff != null ? formatMoney(diff) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-bone/40 font-medium">
                  <td className="px-4 py-4">Total</td>
                  <td className="px-4 py-4 text-right">{formatMoney(costSummary.estimatedCost)}</td>
                  <td className="px-4 py-4 text-right">
                    {costSummary.awardedBids ? formatMoney(costSummary.awardedBids) : "—"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {costSummary.awardedBids
                      ? formatMoney(costSummary.estimateVsAwarded)
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <details className="mt-8 hub-panel p-5">
            <summary className="cursor-pointer font-mono text-[10px] uppercase text-stone-300">
              Edit a line
            </summary>
            <p className="text-sm text-ink/55 mt-4 mb-4">
              Pick a trade, update our plan or enter the winning sub quote.
            </p>
            {lineList.map((line) => (
              <form
                key={line.id}
                action={updateEstimateLine}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4 border-t border-ink/8 first:border-0 items-end"
              >
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="line_id" value={line.id} />
                <div className="md:col-span-1 text-sm font-medium text-ink">{line.trade_label}</div>
                <div>
                  <label className="field-label">Our plan ($)</label>
                  <input
                    type="number"
                    name="estimated_amount"
                    defaultValue={line.estimated_amount}
                    className="field-input"
                    step="1"
                  />
                </div>
                <div>
                  <label className="field-label">Sub quote ($)</label>
                  <input
                    type="number"
                    name="awarded_amount"
                    defaultValue={line.awarded_amount ?? ""}
                    className="field-input"
                    step="1"
                    placeholder="When awarded"
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 px-4 bg-ink text-bone font-mono text-[10px] uppercase"
                >
                  Save
                </button>
              </form>
            ))}
          </details>
        </section>
      )}

      <section className="hub-panel p-6">
        <h3 className="eyebrow mb-4">Quick total override</h3>
        <form action={updateProjectEstimatedCost} className="flex flex-wrap gap-4 items-end">
          <input type="hidden" name="project_id" value={id} />
          <div>
            <label className="field-label">Total our cost plan ($)</label>
            <input
              type="number"
              name="estimated_cost"
              defaultValue={project.estimated_cost ?? ""}
              className="field-input w-40"
              step="1"
            />
          </div>
          <button type="submit" className="h-10 px-4 bg-ink text-bone font-mono text-[10px] uppercase">
            Update total
          </button>
        </form>
        <p className="text-xs text-ink/45 mt-3">
          Client billing ({formatMoney(Number(project.contract_value ?? 0)) || "not set"}) is managed in{" "}
          <Link href={`/admin/projects/${id}/billing`} className="text-copper hover:underline">
            Money & Invoices
          </Link>
          .
        </p>
      </section>

      <div className="mt-10">
        <Link
          href={`/admin/projects/${id}`}
          className="font-mono text-[10px] uppercase text-copper hover:underline"
        >
          ← Back to master board
        </Link>
      </div>
    </div>
  );
}
