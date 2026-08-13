import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/HubUI";
import { formatMoney } from "@/lib/billing/constants";
import {
  aggregateJobCosts,
  aggregateTradeCosts,
  type JobCostProject,
  type JobCostRollupRow,
} from "@/lib/reports/job-cost";
import { loadCostBenchmarks } from "@/lib/estimate/cost-history";
import { describeBenchmark } from "@/lib/estimate/benchmarks";

export const dynamic = "force-dynamic";

/**
 * The company-wide money lens: every job's cost plan vs its spend on one
 * screen, which trades run over across jobs, and what recorded history
 * says lines actually cost.
 */
export default async function JobCostsPage() {
  const supabase = await createClient();

  const [{ data: projectRows }, { data: rollupRows }, benchmarks] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, status, contract_value, heated_square_footage")
      .order("title"),
    supabase
      .from("project_cost_line_rollup")
      .select(
        "project_id, section, line_type, budget, committed, actual, billed, co_approved, revised_budget"
      ),
    loadCostBenchmarks(supabase),
  ]);

  const projects = (projectRows ?? []) as JobCostProject[];
  const rollup = ((rollupRows ?? []) as JobCostRollupRow[]).map((r) => ({
    ...r,
    budget: r.budget == null ? null : Number(r.budget),
    committed: Number(r.committed ?? 0),
    actual: Number(r.actual ?? 0),
    billed: Number(r.billed ?? 0),
    co_approved: Number(r.co_approved ?? 0),
    revised_budget: r.revised_budget == null ? null : Number(r.revised_budget),
  }));

  const jobs = aggregateJobCosts(projects, rollup);
  const trades = aggregateTradeCosts(rollup);
  const history = Object.values(benchmarks).sort((a, b) => b.avgActual - a.avgActual);

  const totals = jobs.reduce(
    (t, j) => ({
      budget: t.budget + j.revisedBudget,
      spent: t.spent + j.spent,
      contract: t.contract + (j.contract ?? 0),
    }),
    { budget: 0, spent: 0, contract: 0 }
  );

  return (
    <div className="max-w-6xl">
      <HubPageHeader
        title="Job costs"
        description="Every job's budget against its real spend, on one screen. This is the page that says whether the pricing is working."
      />

      <section className="mb-12">
        <div className="border border-ink/10 overflow-x-auto">
          <table className="app-table w-full min-w-[960px]">
            <thead>
              <tr className="bg-bone/60 text-left app-label">
                <th className="px-3 py-3">Job</th>
                <th className="px-3 py-3 text-right w-32">Budget (rev.)</th>
                <th className="px-3 py-3 text-right w-28">Committed</th>
                <th className="px-3 py-3 text-right w-28">Actual</th>
                <th className="px-3 py-3 text-right w-28">Remaining</th>
                <th className="px-3 py-3 text-right w-32">Contract</th>
                <th className="px-3 py-3 text-right w-32">Margin at budget</th>
                <th className="px-3 py-3 text-right w-28">$/heated sqft</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm italic app-muted">
                    No cost plans yet. Start one from a project&apos;s Costs tab.
                  </td>
                </tr>
              )}
              {jobs.map((j) => (
                <tr key={j.projectId} className="bg-paper">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/projects/${j.projectId}/costs`}
                      className="text-sm text-navy hover:text-copper"
                    >
                      {j.title}
                    </Link>
                    {j.coApproved !== 0 && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-sky-700">
                        {j.coApproved > 0 ? "+" : ""}
                        {formatMoney(j.coApproved)} CO
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm">
                    {formatMoney(j.revisedBudget)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-ink/70">
                    {j.committed ? formatMoney(j.committed) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-ink/70">
                    {j.actual ? formatMoney(j.actual) : "—"}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm ${
                      j.remaining < -0.005 ? "text-red-700 font-medium" : "text-ink/70"
                    }`}
                  >
                    {formatMoney(j.remaining)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm">
                    {j.contract != null ? formatMoney(j.contract) : "—"}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm ${
                      j.marginAtBudget != null && j.marginAtBudget < 0
                        ? "text-red-700 font-medium"
                        : "text-emerald-800"
                    }`}
                  >
                    {j.marginAtBudget != null ? formatMoney(j.marginAtBudget) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-ink/70">
                    {j.spentPerHeatedSqft != null ? formatMoney(j.spentPerHeatedSqft) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {jobs.length > 0 && (
              <tfoot className="border-t-2 border-ink/15">
                <tr className="bg-bone/40 font-medium">
                  <td className="px-3 py-3">All jobs</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    {formatMoney(totals.budget)}
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-right font-mono tabular-nums">
                    {formatMoney(totals.spent)} spent
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    {formatMoney(totals.budget - totals.spent)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    {formatMoney(totals.contract)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    {formatMoney(totals.contract - totals.budget)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/45 leading-relaxed max-w-3xl">
          Budget includes approved change orders. &ldquo;Margin at budget&rdquo; is contract minus
          revised budget — what each job earns if it lands on plan. Spend counts the larger of
          committed and actual, never both.
        </p>
      </section>

      {trades.length > 0 && (
        <section className="mb-12">
          <h3 className="app-h2 !text-[16px] mb-3">Where the money runs over</h3>
          <div className="border border-ink/10 overflow-x-auto">
            <table className="app-table w-full min-w-[640px]">
              <thead>
                <tr className="bg-bone/60 text-left app-label">
                  <th className="px-3 py-3">Section</th>
                  <th className="px-3 py-3 text-right w-32">Budgeted</th>
                  <th className="px-3 py-3 text-right w-32">Actual</th>
                  <th className="px-3 py-3 text-right w-28">Variance</th>
                  <th className="px-3 py-3 text-right w-24">Jobs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {trades.map((t) => (
                  <tr key={t.section} className="bg-paper">
                    <td className="px-3 py-2.5 text-sm text-navy">{t.section}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm">
                      {formatMoney(t.revisedBudget)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm">
                      {formatMoney(t.actual)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm ${
                        (t.variancePct ?? 0) > 0.02
                          ? "text-red-700 font-medium"
                          : "text-emerald-800"
                      }`}
                    >
                      {t.variancePct != null
                        ? `${t.variancePct > 0 ? "+" : ""}${Math.round(t.variancePct * 100)}%`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-ink/70">
                      {t.projectCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink/45">
            Only lines with vendor bills coded to them count. Sections that keep landing red are
            where the estimating template needs a harder look.
          </p>
        </section>
      )}

      <section>
        <h3 className="app-h2 !text-[16px] mb-3">What recorded history says</h3>
        {history.length === 0 ? (
          <div className="app-card p-6 text-sm app-muted leading-relaxed">
            Nothing recorded yet. On each project&apos;s Costs tab, hit{" "}
            <span className="text-navy">Record actuals to history</span> at closeout — every capture
            makes the next estimate smarter.
          </div>
        ) : (
          <ul className="app-card divide-y divide-navy/[0.06]">
            {history.map((b) => (
              <li key={b.code} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
                <span className="font-mono text-xs text-ink/55 w-12 shrink-0">{b.code}</span>
                <span className="text-sm text-navy">{b.tradeLabel}</span>
                <span className="text-xs app-muted">{describeBenchmark(b)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
