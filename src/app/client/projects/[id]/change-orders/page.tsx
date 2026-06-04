import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { clientRespondChangeOrder } from "@/lib/actions/change-orders";
import {
  CHANGE_ORDER_STATUS_LABELS,
  CHANGE_ORDER_STATUS_STYLES,
} from "@/lib/project/labels";

export const dynamic = "force-dynamic";

export default async function ClientChangeOrdersPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/client");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id")
    .eq("id", id)
    .single();

  if (!project || project.client_id !== user.id) notFound();

  const { data: orders } = await supabase
    .from("change_orders")
    .select("*")
    .eq("project_id", id)
    .neq("status", "draft")
    .order("number", { ascending: false });

  return (
    <div className="px-6 md:px-10 lg:px-14 py-12 md:py-16 mx-auto max-w-3xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink"
      >
        ← {project.title}
      </Link>
      <h1 className="mt-6 font-display text-3xl text-ink">Change Orders</h1>
      <p className="mt-3 text-ink/65 text-sm">
        Review scope and cost changes. Approve to update your contract value.
      </p>

      <ul className="mt-10 space-y-6">
        {(orders ?? []).map((co) => (
          <li key={co.id} className="bg-paper border border-ink/15 p-8">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="font-mono text-xs text-stone-300">CO #{co.number}</span>
              <h2 className="font-display text-xl text-ink">{co.title}</h2>
              <span
                className={`text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border ${CHANGE_ORDER_STATUS_STYLES[co.status]}`}
              >
                {CHANGE_ORDER_STATUS_LABELS[co.status]}
              </span>
            </div>
            <p className="text-sm text-ink/80 whitespace-pre-wrap leading-relaxed">
              {co.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-mono text-stone-300">
              {co.cost_impact != null && (
                <span>Cost impact: ${Number(co.cost_impact).toLocaleString()}</span>
              )}
              {co.schedule_impact_days != null && (
                <span>Schedule: +{co.schedule_impact_days} days</span>
              )}
            </div>
            {co.status === "pending_client" && (
              <div className="mt-8 flex gap-3">
                <form
                  action={async (fd) => {
                    await clientRespondChangeOrder(fd);
                  }}
                >
                  <input type="hidden" name="id" value={co.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="decision" value="approved" />
                  <button
                    type="submit"
                    className="h-11 px-6 bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase"
                  >
                    Approve
                  </button>
                </form>
                <form
                  action={async (fd) => {
                    await clientRespondChangeOrder(fd);
                  }}
                >
                  <input type="hidden" name="id" value={co.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <button
                    type="submit"
                    className="h-11 px-6 border border-ink/30 font-mono text-[10px] tracking-[0.2em] uppercase hover:border-red-400 hover:text-red-700"
                  >
                    Decline
                  </button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!orders?.length && (
        <p className="mt-12 text-ink/50 italic text-center py-12 border border-dashed border-ink/20">
          No change orders pending your review.
        </p>
      )}
    </div>
  );
}
