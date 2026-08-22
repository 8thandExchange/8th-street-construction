import type { Metadata } from "next";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeWorkflowEvents } from "@/lib/analytics/summary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workflow usage — 8th Street Construction",
};

const LABELS: Record<string, string> = {
  proposal: "Proposals",
  bid: "Subcontractor bids",
  punch: "Punch items",
  inspection: "Inspections",
  field_log: "Field logs",
  assistant_approval: "Assistant approvals",
  change_order: "Change orders",
};

export default async function WorkflowUsagePage() {
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await createAdminClient()
    .from("workflow_events")
    .select("workflow, event, entity_id, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  const summaries = summarizeWorkflowEvents(data ?? []);

  return (
    <div className="max-w-4xl p-4 md:p-8 lg:p-10">
      <span className="app-label">Company</span>
      <h1 className="mt-2 app-h1">Workflow usage</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed app-muted">
        Starts, completions, and abandonments for the last 30 days. Time-to-decision is the median
        from the first start on a record to its complete or abandon event.
      </p>

      {summaries.length === 0 ? (
        <div className="mt-8 rounded-xl border border-navy/10 bg-white p-6 text-sm app-muted">
          No measured workflows yet. Proposal sends, bid submissions, punch items, field capture,
          inspections, and assistant approvals will appear here as the team uses them.
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-navy/10 bg-white">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-navy/10 text-[11px] font-medium uppercase tracking-[0.08em] text-navy/45">
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Starts</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Abandoned</th>
                <th className="px-4 py-3">Completion</th>
                <th className="px-4 py-3">Median decision</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((row) => (
                <tr key={row.workflow} className="border-b border-navy/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">
                    {LABELS[row.workflow] ?? row.workflow}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.starts}</td>
                  <td className="px-4 py-3 tabular-nums">{row.completes}</td>
                  <td className="px-4 py-3 tabular-nums">{row.abandons}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.completionRate == null ? "—" : `${Math.round(row.completionRate * 100)}%`}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.medianDecisionMinutes == null
                      ? "—"
                      : row.medianDecisionMinutes < 60
                        ? `${Math.round(row.medianDecisionMinutes)}m`
                        : `${(row.medianDecisionMinutes / 60).toFixed(1)}h`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
