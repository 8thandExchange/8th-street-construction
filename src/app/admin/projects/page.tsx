import { createClient } from "@/lib/supabase/server";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";
import Link from "next/link";
import { formatMoney } from "@/lib/billing/constants";
import { PROJECT_STATUS_LABELS } from "@/lib/project/labels";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-stone-300 text-stone-300",
  pre_construction: "border-blue-400/50 text-blue-600",
  in_progress: "border-copper/50 text-copper",
  completed: "border-emerald-500/50 text-emerald-600",
  on_hold: "border-amber-500/50 text-amber-600",
  archived: "border-stone-300 text-stone-300",
};

export default async function AdminProjects() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, slug, title, category, status, updated_at, contract_value, estimated_cost, playbook_applied_at, client_id"
    )
    .order("updated_at", { ascending: false });

  const enriched = await Promise.all(
    (projects ?? []).map(async (p) => {
      const [{ data: tasks }, { count: estimateLines }] = await Promise.all([
        supabase.from("project_tasks").select("status").eq("project_id", p.id),
        supabase
          .from("project_estimate_lines")
          .select("id", { count: "exact", head: true })
          .eq("project_id", p.id),
      ]);
      const total = tasks?.length ?? 0;
      const done = tasks?.filter((t) => t.status === "done").length ?? 0;
      const pct = total ? Math.round((done / total) * 100) : 0;
      return { ...p, pct, total, done, hasCostPlan: (estimateLines ?? 0) > 0 };
    })
  );

  return (
    <div className="p-8 md:p-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="eyebrow">— All jobs</span>
          <h1 className="mt-2 font-display text-display-md text-ink">Projects</h1>
          <p className="mt-2 text-sm text-ink/55">Tap any row to open the job master board.</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex h-12 items-center px-6 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors"
        >
          + New Project
        </Link>
      </div>

      {enriched.length > 0 ? (
        <div className="bg-paper border border-ink/15 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <th className="px-6 py-4 eyebrow">Job</th>
                <th className="px-6 py-4 eyebrow">Progress</th>
                <th className="px-6 py-4 eyebrow hidden md:table-cell">Our cost plan</th>
                <th className="px-6 py-4 eyebrow hidden md:table-cell">Client pays</th>
                <th className="px-6 py-4 eyebrow">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {enriched.map((p) => (
                <tr key={p.id} className="hover:bg-bone/50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="block font-medium text-ink hover:text-copper"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-stone-300 font-mono mt-1">
                      {PROJECT_CATEGORY_LABELS[p.category]}
                      {!p.client_id && " · No client linked"}
                      {!p.hasCostPlan && p.status !== "completed" && " · No cost plan"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {p.playbook_applied_at && p.total > 0 ? (
                      <div>
                        <div className="font-mono text-sm text-ink">{p.pct}%</div>
                        <div className="text-[10px] text-stone-300">
                          {p.done}/{p.total} tasks
                        </div>
                      </div>
                    ) : (
                      <span className="text-stone-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm hidden md:table-cell">
                    {p.estimated_cost ? formatMoney(Number(p.estimated_cost)) : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm hidden md:table-cell">
                    {p.contract_value ? formatMoney(Number(p.contract_value)) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block text-[10px] font-mono uppercase px-2 py-1 border ${STATUS_STYLES[p.status] ?? ""}`}
                    >
                      {PROJECT_STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-ink/15 p-16 text-center bg-paper">
          <p className="text-ink/50 mb-6">No projects yet.</p>
          <Link
            href="/admin/projects/new"
            className="inline-flex h-12 items-center px-6 bg-ink text-bone hover:bg-copper font-mono text-[11px] uppercase"
          >
            Create your first project
          </Link>
        </div>
      )}
    </div>
  );
}
