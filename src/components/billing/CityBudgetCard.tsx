import {
  addCityBudgetLine,
  deleteCityBudgetLine,
  loadCityBudget608,
} from "@/lib/actions/city-budget";
import { formatMoney } from "@/lib/billing/constants";

export type CityBudgetRow = {
  id: string;
  city_number: number;
  description: string;
  budget_amount: number;
  /** Collected on PAID invoices — unpaid/sent invoices don't count yet */
  billed: number;
};

/**
 * The city-approved budget this job bills against. Every invoice line
 * picks one of these City #s, so this table is the live budget-vs-billed
 * view (what the office used to keep in the Budget vs Actuals spreadsheet).
 */
export function CityBudgetCard({
  projectId,
  rows,
  is608Macon,
}: {
  projectId: string;
  rows: CityBudgetRow[];
  is608Macon: boolean;
}) {
  const totalBudget = rows.reduce((s, r) => s + r.budget_amount, 0);
  const totalBilled = rows.reduce((s, r) => s + r.billed, 0);

  return (
    <section className="mt-10">
      <div className="mb-4">
        <h3 className="font-display text-xl text-ink">City budget</h3>
        <p className="mt-1 text-sm text-ink/55 max-w-2xl leading-relaxed">
          The city-approved budget for this house. Every invoice line bills against one of these
          City #s — this table shows what&apos;s been paid and what&apos;s left on each line.
          Invoices count once they&apos;re paid, not when they&apos;re sent.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="hub-panel p-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink/60 max-w-md">
            No city budget loaded yet.
            {is608Macon
              ? " Load the approved H-87 budget for 608 Macon (33 lines, $239,665) with one click."
              : " Add the budget lines from the city's approved budget sheet below."}
          </p>
          {is608Macon && (
            <form action={loadCityBudget608}>
              <input type="hidden" name="project_id" value={projectId} />
              <button type="submit" className="app-btn app-btn-primary !h-10">
                Load 608 Macon city budget
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="hub-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-stone-400 border-b border-ink/10">
                <th className="px-4 py-3 w-16">City #</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Left</th>
                <th className="px-2 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const left = row.budget_amount - row.billed;
                return (
                  <tr key={row.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-ink/70">{row.city_number}</td>
                    <td className="px-4 py-2 text-ink/85">{row.description}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatMoney(row.budget_amount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.billed ? formatMoney(row.billed) : "—"}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${
                        left < 0 ? "text-red-600 font-semibold" : "text-ink/70"
                      }`}
                    >
                      {formatMoney(left)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {row.billed === 0 && (
                        <form action={deleteCityBudgetLine}>
                          <input type="hidden" name="project_id" value={projectId} />
                          <input type="hidden" name="line_id" value={row.id} />
                          <button
                            type="submit"
                            className="text-stone-300 hover:text-red-600 text-xs"
                            title="Remove this budget line"
                          >
                            ✕
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink/15 font-semibold text-ink">
                <td className="px-4 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totalBudget)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totalBilled)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoney(totalBudget - totalBilled)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <details className="mt-4 hub-panel p-5">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-stone-300">
          Add a budget line
        </summary>
        <form action={addCityBudgetLine} className="mt-5 grid grid-cols-1 sm:grid-cols-[100px_1fr_160px_auto] gap-3 items-end">
          <input type="hidden" name="project_id" value={projectId} />
          <div>
            <label className="field-label">City #</label>
            <input type="number" name="city_number" min="1" step="1" required className="field-input w-full" />
          </div>
          <div>
            <label className="field-label">Description</label>
            <input name="description" required className="field-input w-full" placeholder="e.g. Roofing" />
          </div>
          <div>
            <label className="field-label">Budget ($)</label>
            <input type="number" name="budget_amount" min="0" step="0.01" required className="field-input w-full" />
          </div>
          <button type="submit" className="h-10 px-4 app-btn app-btn-primary">
            Add
          </button>
        </form>
      </details>
    </section>
  );
}
