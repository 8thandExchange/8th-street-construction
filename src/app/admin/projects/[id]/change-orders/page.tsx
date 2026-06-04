import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { createChangeOrder, deleteChangeOrder } from "@/lib/actions/change-orders";
import {
  CHANGE_ORDER_STATUS_LABELS,
  CHANGE_ORDER_STATUS_STYLES,
} from "@/lib/project/labels";

export const dynamic = "force-dynamic";

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
      <h2 className="font-display text-2xl text-ink mb-2">Change Orders</h2>
      <p className="text-sm text-ink/60 mb-8">
        Document scope changes. Send to client for approval — approved orders update contract
        value.
      </p>

      <form
        action={async (fd) => {
          await createChangeOrder(fd);
        }}
        className="p-8 border border-ink/15 bg-paper space-y-5 mb-10"
      >
        <input type="hidden" name="project_id" value={id} />
        <h3 className="eyebrow">New Change Order</h3>
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
          <span className="text-sm text-ink">Send to client immediately for approval</span>
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center px-5 bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase"
        >
          Create
        </button>
      </form>

      <ul className="space-y-4">
        {(orders ?? []).map((co) => (
          <li key={co.id} className="p-6 bg-paper border border-ink/15">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="font-mono text-xs text-stone-300">#{co.number}</span>
              <h3 className="font-display text-lg text-ink">{co.title}</h3>
              <span
                className={`text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border ${CHANGE_ORDER_STATUS_STYLES[co.status]}`}
              >
                {CHANGE_ORDER_STATUS_LABELS[co.status]}
              </span>
            </div>
            <p className="text-sm text-ink/75 whitespace-pre-wrap">{co.description}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-mono text-stone-300">
              {co.cost_impact != null && (
                <span>Cost: ${Number(co.cost_impact).toLocaleString()}</span>
              )}
              {co.schedule_impact_days != null && (
                <span>Schedule: +{co.schedule_impact_days} days</span>
              )}
            </div>
            {co.status === "draft" && (
              <form
                action={async (fd) => {
                  await deleteChangeOrder(fd);
                }}
                className="mt-4"
              >
                <input type="hidden" name="id" value={co.id} />
                <input type="hidden" name="project_id" value={id} />
                <button
                  type="submit"
                  className="text-[10px] font-mono uppercase text-stone-300 hover:text-red-600"
                >
                  Delete draft
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {!orders?.length && (
        <p className="text-ink/50 italic py-8 text-center border border-dashed border-ink/20">
          No change orders yet.
        </p>
      )}
    </div>
  );
}
