import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/billing/constants";
import { bucketCashWeeks, collectCashItems } from "@/lib/finance/cash-forecast";
import { marginAtCompletion } from "@/lib/finance/margin-at-completion";
import {
  canCloseMonth,
  collectMonthCloseExceptions,
  monthKey,
} from "@/lib/finance/month-close";
import { loadApprovalThresholds, loadMonthCloseMap } from "@/lib/finance/settings";
import {
  closeAccountingMonth,
  reopenAccountingMonth,
  saveApprovalThresholds,
} from "@/lib/actions/finance";
import { aggregateJobCosts, type JobCostProject, type JobCostRollupRow } from "@/lib/reports/job-cost";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

const fmtWeek = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function CashForecastPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const month = monthKey(today);

  const [
    { data: invoices },
    { data: draws },
    { data: bills },
    { data: pos },
    { data: contracts },
    { data: allocations },
    { data: projectRows },
    { data: rollupRows },
    thresholds,
    closeMap,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, title, invoice_number, status, total, amount_paid, due_date, project:projects(id, title)"),
    supabase
      .from("payment_draws")
      .select("id, title, status, amount, scheduled_date, project:projects(id, title)"),
    supabase.from("vendor_bills").select("id, title, status, amount, due_date, project_id"),
    supabase
      .from("purchase_orders")
      .select("id, po_number, title, status, total, needed_by, acknowledged_at, project_id, project:projects(title)"),
    supabase.from("project_contracts").select("id, status"),
    supabase.from("vendor_bill_allocations").select("vendor_bill_id"),
    supabase
      .from("projects")
      .select("id, title, status, contract_value, heated_square_footage")
      .in("status", ["pre_construction", "in_progress", "completed"]),
    supabase
      .from("project_cost_line_rollup")
      .select("project_id, section, line_type, budget, committed, actual, billed, co_approved, revised_budget"),
    loadApprovalThresholds(),
    loadMonthCloseMap(),
  ]);

  const projectTitle = (project: { title?: string } | { title?: string }[] | null | undefined) => {
    const row = Array.isArray(project) ? project[0] : project;
    return row?.title ?? null;
  };

  const allocated = new Set((allocations ?? []).map((row) => row.vendor_bill_id));
  const items = collectCashItems({
    today,
    invoices: (invoices ?? []).map((invoice) => ({
      ...invoice,
      projectTitle: projectTitle(invoice.project),
    })),
    draws: (draws ?? []).map((draw) => ({
      ...draw,
      projectTitle: projectTitle(draw.project),
    })),
    bills: bills ?? [],
    purchaseOrders: (pos ?? []).map((po) => ({
      ...po,
      projectTitle: projectTitle(po.project),
    })),
  });
  const weeks = bucketCashWeeks(items, 0, 8, today);
  const jobs = aggregateJobCosts(
    (projectRows ?? []) as JobCostProject[],
    ((rollupRows ?? []) as JobCostRollupRow[]).map((row) => ({
      ...row,
      budget: row.budget == null ? null : Number(row.budget),
      committed: Number(row.committed ?? 0),
      actual: Number(row.actual ?? 0),
      billed: Number(row.billed ?? 0),
      co_approved: Number(row.co_approved ?? 0),
      revised_budget: row.revised_budget == null ? null : Number(row.revised_budget),
    }))
  ).map((job) =>
    marginAtCompletion({
      projectId: job.projectId,
      title: job.title,
      contract: job.contract,
      revisedBudget: job.revisedBudget,
      spent: job.spent,
    })
  );

  const exceptions = collectMonthCloseExceptions({
    month,
    invoices: (invoices ?? []).map((invoice) => {
      const project = Array.isArray(invoice.project) ? invoice.project[0] : invoice.project;
      return {
        id: invoice.id,
        status: invoice.status,
        due_date: invoice.due_date,
        projectId: project && "id" in project ? String(project.id) : null,
      };
    }),
    bills: (bills ?? []).map((bill) => ({
      id: bill.id,
      status: bill.status,
      due_date: bill.due_date,
      allocated: allocated.has(bill.id),
      projectId: bill.project_id,
    })),
    purchaseOrders: (pos ?? []).map((po) => ({
      id: po.id,
      status: po.status,
      acknowledged_at: po.acknowledged_at,
      projectId: po.project_id,
    })),
    contracts: contracts ?? [],
  });
  const closed = closeMap[month]?.status === "closed";
  const closeable = canCloseMonth(exceptions);
  const macTotal = jobs.reduce((sum, job) => sum + (job.marginAtCompletion ?? 0), 0);
  const nextIn = items.filter((item) => item.direction === "in").reduce((sum, item) => sum + item.amount, 0);
  const nextOut = items.filter((item) => item.direction === "out").reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl">
      <Link href="/admin/accounting" className="text-xs font-medium text-copper hover:underline">
        ← Accounting
      </Link>
      <h1 className="mt-3 app-h1">Cash and close</h1>
      <p className="mt-3 max-w-2xl text-sm app-muted">
        Expected cash from invoices and draws, money going out on bills and issued POs, and
        margin at completion from the live cost plans. QuickBooks still exports from Accounting;
        OAuth sync is the next wiring step.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Expected in (8 weeks)", value: formatMoney(nextIn) },
          { label: "Expected out (8 weeks)", value: formatMoney(nextOut) },
          { label: "Net", value: formatMoney(nextIn - nextOut) },
          { label: "MAC across jobs", value: formatMoney(macTotal) },
        ].map((card) => (
          <div key={card.label} className="app-card p-4">
            <p className="app-label">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-navy app-num">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="app-h2">Eight-week cash</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="app-table">
            <thead>
              <tr className="text-left app-label border-b border-ink/10">
                <th className="pb-2">Week of</th>
                <th className="pb-2">In</th>
                <th className="pb-2">Out</th>
                <th className="pb-2">Net</th>
                <th className="pb-2">Running</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.weekStart} className="border-b border-ink/5">
                  <td className="py-3">{fmtWeek(week.weekStart)}</td>
                  <td className="py-3 app-num">{formatMoney(week.inflow)}</td>
                  <td className="py-3 app-num">{formatMoney(week.outflow)}</td>
                  <td className="py-3 app-num">{formatMoney(week.net)}</td>
                  <td className="py-3 app-num font-medium text-navy">{formatMoney(week.running)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && (
          <p className="mt-4 text-sm italic app-muted">Nothing scheduled in or out yet.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="app-h2">Margin at completion</h2>
        <ul className="mt-4 space-y-3">
          {jobs.map((job) => (
            <li key={job.projectId} className="app-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <Link
                  href={`/admin/projects/${job.projectId}/costs`}
                  className="font-medium text-navy hover:text-copper"
                >
                  {job.title}
                </Link>
                <span className="app-num text-navy">
                  {job.marginAtCompletion == null ? "—" : formatMoney(job.marginAtCompletion)}
                </span>
              </div>
              <p className="mt-1 text-xs app-muted">
                Contract {job.contract == null ? "—" : formatMoney(job.contract)} · forecast cost{" "}
                {formatMoney(job.forecastCost)} · {job.reason}
              </p>
            </li>
          ))}
        </ul>
        {jobs.length === 0 && (
          <p className="mt-4 text-sm italic app-muted">No cost plans to forecast yet.</p>
        )}
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="app-card p-6">
          <h2 className="app-h2 !text-[16px]">Month close · {month}</h2>
          <p className="mt-1 text-xs app-muted">
            {closed
              ? `Closed ${closeMap[month]?.closed_at ? new Date(closeMap[month]!.closed_at!).toLocaleDateString("en-US") : ""}`
              : closeable
                ? "No blocking exceptions. Safe to close."
                : "Clear critical exceptions before closing."}
          </p>
          <ul className="mt-4 space-y-2">
            {exceptions.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="text-sm text-copper hover:underline">
                  {item.severity === "critical" ? "Blocker · " : "Watch · "}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {exceptions.length === 0 && (
            <p className="mt-4 text-sm italic app-muted">No exceptions this month.</p>
          )}
          {closed ? (
            <form action={reopenAccountingMonth} className="mt-4">
              <input type="hidden" name="month" value={month} />
              <SubmitButton className="app-btn app-btn-ghost !h-8 !text-xs">Reopen month</SubmitButton>
            </form>
          ) : (
            <form action={closeAccountingMonth} className="mt-4 space-y-2">
              <input type="hidden" name="month" value={month} />
              <input name="notes" placeholder="Close notes (optional)" className="field-input" />
              {closeable ? (
                <SubmitButton className="app-btn app-btn-primary !h-8 !text-xs">
                  Close {month}
                </SubmitButton>
              ) : (
                <p className="text-xs app-muted">Resolve blockers before closing.</p>
              )}
            </form>
          )}
        </div>

        <div className="app-card p-6">
          <h2 className="app-h2 !text-[16px]">Approval thresholds</h2>
          <p className="mt-1 text-xs app-muted">
            Sending an invoice, recording a bill, or issuing a PO over these amounts requires an
            extra confirmation.
          </p>
          <form action={saveApprovalThresholds} className="mt-4 grid gap-3">
            <label className="field-label">
              Invoice
              <input
                name="invoice"
                type="number"
                min={0}
                step="1"
                defaultValue={thresholds.invoice}
                className="field-input mt-1"
              />
            </label>
            <label className="field-label">
              Vendor bill
              <input
                name="bill"
                type="number"
                min={0}
                step="1"
                defaultValue={thresholds.bill}
                className="field-input mt-1"
              />
            </label>
            <label className="field-label">
              Purchase order
              <input
                name="purchaseOrder"
                type="number"
                min={0}
                step="1"
                defaultValue={thresholds.purchaseOrder}
                className="field-input mt-1"
              />
            </label>
            <SubmitButton className="app-btn app-btn-secondary !h-8 !text-xs">Save thresholds</SubmitButton>
          </form>
        </div>
      </section>
    </div>
  );
}
