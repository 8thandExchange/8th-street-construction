import { createClient } from "@/lib/supabase/server";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";
import Link from "next/link";
import { formatMoney } from "@/lib/billing/constants";
import { PROJECT_STATUS_LABELS } from "@/lib/project/labels";
import { appStatusSelectStyles } from "@/lib/project/status-badges";
import { InlineStatusSelect } from "@/components/admin/InlineStatusSelect";
import { FundingTypeDot } from "@/components/project/ProjectFundingBadge";
import { FUNDING_TYPE_SHORT, parseFundingType } from "@/lib/project/funding";
import { setProjectStatusAction } from "@/lib/actions/project-status";

export const dynamic = "force-dynamic";

const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export default async function AdminProjects() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, slug, title, category, status, updated_at, contract_value, estimated_cost, playbook_applied_at, client_id, funding_type, hud_grant_year"
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
    <div className="p-4 md:p-8 lg:p-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="eyebrow">— All jobs</span>
          <h1 className="mt-2 app-h1">Projects</h1>
          <p className="mt-2 text-sm text-ink/55">Tap any row to open the job master board.</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="app-btn app-btn-primary"
        >
          + New Project
        </Link>
      </div>

      {enriched.length > 0 ? (
        <div className="app-card overflow-hidden overflow-x-auto">
          <table className="app-table min-w-[720px]">
            <thead>
              <tr>
                <th className="">Job</th>
                <th className="">Progress</th>
                <th className="hidden md:table-cell">Our cost plan</th>
                <th className="hidden md:table-cell">Client pays</th>
                <th className="">Status</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((p) => (
                <tr key={p.id} className="hover:bg-bone/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="flex items-start gap-3 group"
                    >
                      <FundingTypeDot fundingType={p.funding_type} slug={p.slug} />
                      <span className="block font-medium text-ink group-hover:text-copper">
                        {p.title}
                      </span>
                    </Link>
                    <div className="text-xs app-muted mt-1 pl-5">
                      {PROJECT_CATEGORY_LABELS[p.category]}
                      {parseFundingType(p.funding_type) !== "private" && (
                        <> · {FUNDING_TYPE_SHORT[parseFundingType(p.funding_type)]}</>
                      )}
                      {!p.client_id && " · No client linked"}
                      {!p.hasCostPlan && p.status !== "completed" && " · No cost plan"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.playbook_applied_at && p.total > 0 ? (
                      <div>
                        <div className="text-sm font-medium tabular-nums text-navy">{p.pct}%</div>
                        <div className="text-[11px] app-muted">
                          {p.done}/{p.total} tasks
                        </div>
                      </div>
                    ) : (
                      <span className="app-muted text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">
                    {p.estimated_cost ? formatMoney(Number(p.estimated_cost)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">
                    {p.contract_value ? formatMoney(Number(p.contract_value)) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <InlineStatusSelect
                      value={p.status}
                      options={PROJECT_STATUS_OPTIONS}
                      styles={appStatusSelectStyles("project")}
                      action={setProjectStatusAction}
                      hiddenFields={{ id: p.id }}
                      aria-label={`Change status for ${p.title}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="app-card p-16 text-center">
          <p className="app-muted mb-6">No projects yet.</p>
          <Link
            href="/admin/projects/new"
            className="app-btn app-btn-primary"
          >
            Create your first project
          </Link>
        </div>
      )}
    </div>
  );
}
