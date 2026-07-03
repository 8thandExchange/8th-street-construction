import Link from "next/link";
import { notFound } from "next/navigation";
import { loadProjectForHub } from "@/lib/data/project-hub";
import { loadJobMasterBoard } from "@/lib/data/company-dashboard";
import { loadAdminCommandCenter } from "@/lib/data/project-dashboard";
import { HubAlertStrip } from "@/components/hub/HubUI";
import { CommandCenterHero } from "@/components/dashboard/CommandCenterHero";
import { BudgetWaterfall } from "@/components/dashboard/BudgetWaterfall";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ActionQueue } from "@/components/dashboard/ActionQueue";
import { ScheduleStrip } from "@/components/dashboard/ScheduleStrip";
import { QuickLinkGrid } from "@/components/dashboard/QuickLinkGrid";
import { formatMoney } from "@/lib/billing/constants";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_STYLES,
  TASK_STATUS_LABELS,
  TASK_STATUS_STYLES,
  DRAW_STATUS_LABELS,
} from "@/lib/project/labels";
import { InlineStatusSelect } from "@/components/admin/InlineStatusSelect";
import { setProjectStatusAction, setTaskStatusAction } from "@/lib/actions/project-status";
import type { DashboardAction } from "@/lib/data/project-dashboard";
import { ProjectFundingBadge } from "@/components/project/ProjectFundingBadge";
import { parseFundingType } from "@/lib/project/funding";

const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);
const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const dynamic = "force-dynamic";

export default async function JobMasterBoardPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [hub, board] = await Promise.all([loadProjectForHub(id), loadJobMasterBoard(id)]);
  if (!hub || !board) notFound();

  const { project, summary } = hub;
  const base = `/admin/projects/${id}`;

  const dashboard = await loadAdminCommandCenter(id, base, {
    estimatedCost: Number(project.estimated_cost ?? 0),
    clientContract: Number(project.contract_value ?? 0),
    estimateLines: board.estimateLines,
    awardedBids: board.awardedBids,
  });

  const actions: DashboardAction[] = [
    ...summary.alerts
      .filter((a): a is typeof a & { href: string } => Boolean(a.href))
      .map((a) => ({
        id: a.id,
        severity: a.severity,
        label: a.title,
        hint: a.detail,
        href: a.href,
      })),
    ...summary.nextActions.map((na, i) => ({
      id: `next-${i}`,
      severity: "info" as const,
      label: na.label,
      hint: na.hint,
      href: na.href,
    })),
  ];

  const timelineItems =
    board.phaseProgress.length > 0
      ? board.phaseProgress.map((p) => ({
          id: p.phaseKey,
          title: p.title,
          status:
            p.tasksPct >= 100
              ? "completed"
              : p.tasksDone > 0
                ? "in_progress"
                : "pending",
          target_date: null as string | null,
        }))
      : await (async () => {
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          const { data: milestones } = await supabase
            .from("project_milestones")
            .select("id, title, status, target_date")
            .eq("project_id", id)
            .order("display_order")
            .limit(8);
          return (milestones ?? []).map((m) => ({
            id: m.id,
            title: m.title,
            status: m.status,
            target_date: m.target_date,
          }));
        })();

  const heroActions = [
    { label: "Post update", href: `${base}/updates`, primary: true },
    { label: "Field notes", href: `${base}/daily-logs` },
    ...(board.client
      ? [{ label: "Preview portal ↗", href: `/client/projects/${id}`, primary: false }]
      : []),
  ];

  return (
    <div className="max-w-7xl">
      <HubAlertStrip alerts={summary.alerts} />

      <CommandCenterHero
        variant="admin"
        title={project.title}
        subtitle={
          project.street_address
            ? `${project.street_address}${project.location ? ` · ${project.location}` : ""}`
            : project.location ?? undefined
        }
        progressPct={board.progressPct || summary.overallProgress}
        progressLabel="Done"
        statusControl={{
          value: project.status,
          options: PROJECT_STATUS_OPTIONS,
          styles: PROJECT_STATUS_STYLES,
          action: setProjectStatusAction,
          hiddenFields: { id },
        }}
        stats={[
          {
            label: "Checklists",
            value: board.tasksTotal ? `${board.tasksDone}/${board.tasksTotal}` : "—",
          },
          {
            label: "Build phases",
            value: `${summary.milestoneCompleted}/${summary.milestoneTotal}`,
          },
          {
            label: "Open punch",
            value: board.openPunch,
            accent: board.openPunch > 0,
          },
          {
            label: "Collected",
            value: board.paidToUs ? formatMoney(board.paidToUs) : "—",
            accent: board.paidToUs > 0,
          },
        ]}
        actions={heroActions}
        meta={
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <ProjectFundingBadge
              fundingType={parseFundingType((project as { funding_type?: string }).funding_type)}
              slug={project.slug}
              hudGrantYear={(project as { hud_grant_year?: number | null }).hud_grant_year}
              size="sm"
            />
            {!project.client_id && (
              <Link
                href={`${base}/overview#client-funding`}
                className="font-mono text-[10px] uppercase text-amber-300/90 hover:underline"
              >
                Assign client →
              </Link>
            )}
          </div>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <BudgetWaterfall
          projectId={id}
          cost={dashboard.costSummary}
          billing={dashboard.billingSummary}
          variant="admin"
        />

        <ActionQueue
          actions={actions}
          title="Needs attention"
          emptyTitle="Job is on track"
          emptyDescription="No urgent items. Post a field note or check in with the client when you're ready."
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3">
          <ActivityFeed
            activities={dashboard.activities}
            viewAllHref={`${base}/daily-logs`}
            emptyMessage="Field notes, updates, messages, and billing events will stream here as the job runs."
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="dash-panel p-6">
            <div className="flex justify-between items-baseline mb-4">
              <h3 className="app-h2">Open checklists</h3>
              <Link href={`${base}/tasks`} className="app-label !text-copper">
                All →
              </Link>
            </div>
            {board.openTasks.length ? (
              <ul className="divide-y divide-ink/8">
                {board.openTasks.slice(0, 5).map((t) => (
                  <li key={t.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink truncate">{t.title}</span>
                    <InlineStatusSelect
                      value={t.status}
                      options={TASK_STATUS_OPTIONS}
                      styles={TASK_STATUS_STYLES}
                      action={setTaskStatusAction}
                      hiddenFields={{ id: t.id, project_id: id }}
                      aria-label={`Change status for ${t.title}`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/45 italic">All checklist items complete.</p>
            )}
          </section>

          {board.client && (
            <section className="dash-panel p-6">
              <span className="eyebrow">Client portal</span>
              <p className="mt-3 font-medium text-ink text-lg">
                {[board.client.first_name, board.client.last_name].filter(Boolean).join(" ") ||
                  board.client.email}
              </p>
              <p className="text-sm text-ink/55">{board.client.email}</p>
              <Link
                href={`${base}/messages`}
                className="inline-flex mt-4 h-9 items-center px-4 app-btn app-btn-secondary"
              >
                Messages →
              </Link>
            </section>
          )}
        </div>
      </div>

      <div className="mb-6">
        <ScheduleStrip
          milestones={timelineItems}
          href={`${base}/schedule`}
          title="Build timeline"
        />
      </div>

      {board.draws.length > 0 && (
        <section className="dash-panel p-6 md:p-8 mb-6">
          <div className="flex justify-between items-baseline mb-4">
            <h3 className="app-h2">Client billing schedule</h3>
            <Link href={`${base}/billing`} className="app-label !text-copper">
              Money & invoices →
            </Link>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {board.draws.map((d) => (
              <li
                key={d.id}
                className="p-4 border border-ink/8 bg-bone/30 flex justify-between gap-4"
              >
                <div>
                  <span className="font-mono text-[10px] text-stone-300 uppercase">
                    Draw {d.draw_number}
                  </span>
                  <p className="text-sm text-ink mt-1">{d.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="app-num text-lg font-medium">{formatMoney(Number(d.amount))}</p>
                  <p className="app-label mt-0.5">
                    {DRAW_STATUS_LABELS[d.status] ?? d.status}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <QuickLinkGrid
        links={[
          { label: "Cost plan", href: `${base}/costs`, description: "Our estimate" },
          { label: "Sub quotes", href: `${base}/bid-requests`, description: "Bid leveling" },
          { label: "Schedule", href: `${base}/schedule`, description: "Gantt view" },
          { label: "Files", href: `${base}/documents`, description: "Plans & permits" },
          { label: "Selections", href: `${base}/selections`, description: "Finishes" },
          { label: "Change orders", href: `${base}/change-orders`, description: "Scope changes" },
          { label: "Punch list", href: `${base}/punch-list`, description: "Closeout items" },
          { label: "Job details", href: `${base}/overview`, description: "Settings" },
        ]}
      />
    </div>
  );
}
