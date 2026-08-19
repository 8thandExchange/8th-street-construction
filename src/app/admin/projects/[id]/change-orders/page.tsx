import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  createChangeOrder,
  deleteChangeOrder,
  deleteChangeOrderAllocation,
  saveChangeOrderAllocation,
} from "@/lib/actions/change-orders";
import { formatMoney } from "@/lib/billing/constants";
import { CHANGE_ORDER_STATUS_LABELS } from "@/lib/project/labels";
import { appStatusBadge } from "@/lib/project/status-badges";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

// Form actions must be module-level "use server" functions returning void —
// inline closures in a server component can't be serialized to the client.
async function createChangeOrderAction(formData: FormData) {
  "use server";
  await createChangeOrder(formData);
}

async function deleteChangeOrderAction(formData: FormData) {
  "use server";
  await deleteChangeOrder(formData);
}

async function saveAllocationAction(formData: FormData) {
  "use server";
  await saveChangeOrderAllocation(formData);
}

async function deleteAllocationAction(formData: FormData) {
  "use server";
  await deleteChangeOrderAllocation(formData);
}

export default async function ProjectChangeOrdersPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const [{ data: orders }, { data: costLines }] = await Promise.all([
    supabase.from("change_orders").select("*").eq("project_id", id).order("number", { ascending: false }),
    supabase
      .from("project_estimate_lines")
      .select("id, code, trade_label, line_type")
      .eq("project_id", id)
      .eq("line_type", "cost")
      .order("display_order"),
  ]);

  const { data: allocations } = await supabase
    .from("change_order_allocations")
    .select("id, change_order_id, estimate_line_id, amount")
    .in("change_order_id", (orders ?? []).map((c: { id: string }) => c.id));

  const lines = (costLines ?? []) as { id: string; code: string | null; trade_label: string }[];
  const lineLabel = (lineId: string) => {
    const l = lines.find((x) => x.id === lineId);
    return l ? [l.code, l.trade_label].filter(Boolean).join(" · ") : "Deleted line";
  };
  const allocationsFor = (coId: string) =>
    ((allocations ?? []) as { id: string; change_order_id: string; estimate_line_id: string; amount: number }[]).filter(
      (a) => a.change_order_id === coId
    );

  return (
    <div className="max-w-3xl">
      <h2 className="app-h1 !text-[18px] mb-2">Change Orders</h2>
      <p className="text-sm app-muted mb-8">
        Document scope changes. Send to client for approval — approved orders update contract
        value.
      </p>

      <form
        action={createChangeOrderAction}
        className="app-card p-6 md:p-8 space-y-5 mb-10"
      >
        <input type="hidden" name="project_id" value={id} />
        <h3 className="app-h2 !text-[16px]">New Change Order</h3>
        <div>
          <label className="field-label">Title *</label>
          <input name="title" required className="field-input" />
        </div>
        <div>
          <label className="field-label">Description *</label>
          <textarea name="description" required rows={4} className="field-input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Cost impact ($)</label>
            <input name="cost_impact" type="number" step="0.01" className="field-input" />
          </div>
          <div>
            <label className="field-label">Schedule impact (days)</label>
            <input name="schedule_impact_days" type="number" className="field-input" />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="send_to_client" className="w-5 h-5 accent-copper" />
          <span className="text-sm text-navy">Send to client immediately for approval</span>
        </label>
        <SubmitButton>Create</SubmitButton>
      </form>

      <ul className="space-y-4">
        {(orders ?? []).map((co) => (
          <li key={co.id} className="app-card p-6">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="text-xs app-muted tabular-nums">#{co.number}</span>
              <h3 className="app-h2">{co.title}</h3>
              <span className={appStatusBadge("change_order", co.status)}>
                {CHANGE_ORDER_STATUS_LABELS[co.status]}
              </span>
            </div>
            <p className="text-sm text-navy/80 whitespace-pre-wrap">{co.description}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs app-muted tabular-nums">
              {co.cost_impact != null && (
                <span>Cost: ${Number(co.cost_impact).toLocaleString()}</span>
              )}
              {co.schedule_impact_days != null && (
                <span>Schedule: +{co.schedule_impact_days} days</span>
              )}
            </div>

            {lines.length > 0 && (() => {
              const allocs = allocationsFor(co.id);
              const allocated = allocs.reduce((s, a) => s + Number(a.amount), 0);
              const impact = co.cost_impact == null ? null : Number(co.cost_impact);
              const unallocated = impact == null ? null : impact - allocated;
              return (
                <details className="mt-4 border-t border-navy/[0.06] pt-3">
                  <summary className="cursor-pointer list-none text-xs font-medium text-copper hover:underline">
                    Where this lands in the budget
                    {allocs.length > 0 && (
                      <span className="ml-2 font-normal app-muted">
                        {formatMoney(allocated)} allocated
                        {unallocated != null && Math.abs(unallocated) > 0.005
                          ? ` · ${formatMoney(unallocated)} not yet placed`
                          : ""}
                      </span>
                    )}
                    {allocs.length === 0 && (
                      <span className="ml-2 font-normal app-muted">
                        not on the budget yet
                        {co.status === "approved" ? " — approved money is invisible to the cost plan until placed" : ""}
                      </span>
                    )}
                  </summary>

                  {allocs.length > 0 && (
                    <ul className="mt-3 divide-y divide-navy/[0.06] text-sm">
                      {allocs.map((a) => (
                        <li key={a.id} className="flex items-center gap-3 py-1.5">
                          <span className="flex-1 text-navy/80">{lineLabel(a.estimate_line_id)}</span>
                          <span className="font-mono tabular-nums">{formatMoney(Number(a.amount))}</span>
                          <form action={deleteAllocationAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="project_id" value={id} />
                            <button type="submit" className="text-xs text-red-700 hover:underline">
                              Remove
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form action={saveAllocationAction} className="mt-3 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="change_order_id" value={co.id} />
                    <div className="min-w-[240px] flex-1">
                      <label className="field-label">Cost line</label>
                      <select name="estimate_line_id" required className="field-input">
                        {lines.map((l) => (
                          <option key={l.id} value={l.id}>
                            {[l.code, l.trade_label].filter(Boolean).join(" · ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-36">
                      <label className="field-label">Amount ($)</label>
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        required
                        placeholder={unallocated != null ? String(unallocated) : ""}
                        className="field-input"
                      />
                    </div>
                    <SubmitButton className="app-btn app-btn-secondary">Place</SubmitButton>
                  </form>
                  <p className="mt-2 text-[11px] app-muted">
                    Negative amounts credit a line. Only approved change orders move the budget grid.
                  </p>
                </details>
              );
            })()}
            {co.status === "draft" && (
              <form action={deleteChangeOrderAction} className="mt-4">
                <input type="hidden" name="id" value={co.id} />
                <input type="hidden" name="project_id" value={id} />
                <button type="submit" className="text-xs text-red-700 hover:underline">
                  Delete draft
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {!orders?.length && (
        <div className="app-card p-12 text-center">
          <p className="app-muted text-sm">No change orders yet.</p>
        </div>
      )}
    </div>
  );
}
