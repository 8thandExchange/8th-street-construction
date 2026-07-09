import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { createChangeOrder, deleteChangeOrder } from "@/lib/actions/change-orders";
import { CHANGE_ORDER_STATUS_LABELS } from "@/lib/project/labels";
import { appStatusBadge } from "@/lib/project/status-badges";

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

export default async function ProjectChangeOrdersPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const { data: orders } = await supabase
    .from("change_orders")
    .select("*")
    .eq("project_id", id)
    .order("number", { ascending: false });

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
        <button
          type="submit"
          className="app-btn app-btn-primary"
        >
          Create
        </button>
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
            {co.status === "draft" && (
              <form action={deleteChangeOrderAction} className="mt-4">
                <input type="hidden" name="id" value={co.id} />
                <input type="hidden" name="project_id" value={id} />
                <button
                  type="submit"
                  className="app-btn app-btn-ghost !h-8 !px-2.5 !text-[12.5px] hover:!text-red-600"
                >
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
