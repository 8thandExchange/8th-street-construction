import { formatMoney } from "@/lib/billing/constants";
import { allocateVendorBill, setInvoiceLineCostCode } from "@/lib/actions/cost-plan";
import type { CostPlan, CostPlanLine } from "@/lib/estimate/cost-plan";

/**
 * Money on this job that isn't attached to a cost code yet.
 *
 * This is the whole point of Phase B: a bill sitting in the system but coded
 * to nothing shows up in no line's Actual, so the cost plan quietly under-
 * reports. Surfacing it as a queue makes the gap visible and one dropdown wide.
 */
export function CostAttributionQueue({
  projectId,
  lines,
  uncoded,
}: {
  projectId: string;
  lines: CostPlanLine[];
  uncoded: CostPlan["uncoded"];
}) {
  const codeOptions = lines
    .filter((l) => l.line_type === "cost")
    .map((l) => ({ id: l.id, label: `${l.code ?? "—"}  ${l.trade_label}` }));

  const nothingToDo = uncoded.bills.length === 0 && uncoded.invoiceLines.length === 0;
  if (nothingToDo || codeOptions.length === 0) return null;

  return (
    <div className="hub-panel p-5 mb-8 border-amber-300/50 bg-amber-50/40">
      <h3 className="eyebrow mb-1">Needs a cost code</h3>
      <p className="text-sm text-ink/60 mb-5 leading-relaxed">
        Money recorded against this job that isn&apos;t on a line yet. Until it&apos;s coded it
        won&apos;t show up in any line&apos;s Actual.
      </p>

      {uncoded.bills.length > 0 && (
        <section className="mb-6">
          <div className="app-label mb-2">Vendor bills</div>
          <div className="space-y-2">
            {uncoded.bills.map((bill) => {
              const left = bill.amount - bill.allocated;
              return (
                <form
                  key={bill.id}
                  action={allocateVendorBill}
                  className="flex flex-wrap items-end gap-2 bg-paper border border-ink/10 px-3 py-2.5"
                >
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="bill_id" value={bill.id} />

                  <div className="flex-1 min-w-[14rem]">
                    <div className="text-sm text-ink">
                      {bill.vendorName} — {bill.title}
                    </div>
                    <div className="text-xs text-ink/45 mt-0.5">
                      {bill.billNumber && <span className="font-mono mr-2">{bill.billNumber}</span>}
                      {formatMoney(bill.amount)}
                      {bill.allocated > 0 && (
                        <span className="ml-2 text-amber-700">
                          {formatMoney(left)} still to code
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="field-label" htmlFor={`bill-code-${bill.id}`}>
                      Cost code
                    </label>
                    <select
                      id={`bill-code-${bill.id}`}
                      name="line_id"
                      required
                      defaultValue=""
                      className="field-input !py-1 !text-sm max-w-[18rem]"
                    >
                      <option value="" disabled>
                        Pick a line…
                      </option>
                      {codeOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label" htmlFor={`bill-amount-${bill.id}`}>
                      Amount
                    </label>
                    <input
                      id={`bill-amount-${bill.id}`}
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={left}
                      defaultValue={left.toFixed(2)}
                      className="field-input !py-1 !text-sm w-28 text-right font-mono"
                    />
                  </div>

                  <button type="submit" className="app-btn app-btn-primary !py-1.5 !text-xs">
                    Code it
                  </button>
                </form>
              );
            })}
          </div>
          <p className="text-xs text-ink/45 mt-2">
            A bill covering several trades can be split — code part of it, then it comes back with
            the remainder.
          </p>
        </section>
      )}

      {uncoded.invoiceLines.length > 0 && (
        <section>
          <div className="app-label mb-2">Billed to the client</div>
          <div className="space-y-2">
            {uncoded.invoiceLines.map((line) => (
              <form
                key={line.id}
                action={setInvoiceLineCostCode}
                className="flex flex-wrap items-end gap-2 bg-paper border border-ink/10 px-3 py-2.5"
              >
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="invoice_line_id" value={line.id} />

                <div className="flex-1 min-w-[14rem]">
                  <div className="text-sm text-ink">{line.description}</div>
                  <div className="text-xs text-ink/45 mt-0.5">
                    <span className="font-mono mr-2">{line.invoiceNumber}</span>
                    {formatMoney(line.amount)}
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor={`inv-code-${line.id}`}>
                    Cost code
                  </label>
                  <select
                    id={`inv-code-${line.id}`}
                    name="line_id"
                    required
                    defaultValue=""
                    className="field-input !py-1 !text-sm max-w-[18rem]"
                  >
                    <option value="" disabled>
                      Pick a line…
                    </option>
                    {codeOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="app-btn app-btn-secondary !py-1.5 !text-xs">
                  Assign
                </button>
              </form>
            ))}
          </div>
          <p className="text-xs text-ink/45 mt-2">
            This is separate from the city budget line on the invoice — that says who pays, this
            says what it was spent on.
          </p>
        </section>
      )}
    </div>
  );
}
