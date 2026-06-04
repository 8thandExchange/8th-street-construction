import Link from "next/link";
import { notFound } from "next/navigation";
import { loadProjectForHub, playbookLabel } from "@/lib/data/project-hub";
import {
  HubAlertStrip,
  HubMetric,
  HubActionRow,
  ProgressRing,
} from "@/components/hub/HubUI";
import { PROJECT_STATUS_LABELS } from "@/lib/project/labels";

export const dynamic = "force-dynamic";

export default async function ProjectCommandPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const data = await loadProjectForHub(id);
  if (!data) notFound();

  const { project, summary } = data;
  const base = `/admin/projects/${id}`;
  const revisedContract = summary.contractValue + summary.changeOrderTotal;
  const budgetPct =
    revisedContract > 0 ? Math.min(100, Math.round((summary.paidDraws / revisedContract) * 100)) : 0;

  return (
    <div className="max-w-6xl">
      <HubAlertStrip alerts={summary.alerts} />

      <div className="grid lg:grid-cols-[auto_1fr] gap-10 mb-12 items-center">
        <ProgressRing pct={summary.overallProgress} label="Complete" />
        <div>
          <p className="text-lg text-ink/75 leading-relaxed max-w-2xl">
            Everything for <span className="text-ink font-medium">{project.title}</span> — build
            sequence, client portal, subs, and billing in one flow.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-mono tracking-wider text-stone-300 uppercase">
            <span>{PROJECT_STATUS_LABELS[project.status] || project.status}</span>
            {summary.playbookApplied && (
              <>
                <span className="text-ink/15">·</span>
                <span>{playbookLabel(summary.playbookId)}</span>
              </>
            )}
            {project.start_date && (
              <>
                <span className="text-ink/15">·</span>
                <span>Start {project.start_date}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
        <HubMetric
          label="Checklists"
          value={
            summary.playbookApplied
              ? `${summary.taskCompleted}/${summary.taskTotal}`
              : "—"
          }
          sub={summary.playbookApplied ? `${summary.overallProgress}% done` : "Apply playbook"}
          href={`${base}/tasks`}
          accent={!summary.playbookApplied}
        />
        <HubMetric
          label="Timeline"
          value={`${summary.milestoneCompleted}/${summary.milestoneTotal}`}
          sub="Client milestones"
          href={`${base}/milestones`}
        />
        <HubMetric
          label="Contract"
          value={revisedContract ? `$${(revisedContract / 1000).toFixed(0)}k` : "—"}
          sub={summary.paidDraws ? `$${summary.paidDraws.toLocaleString()} collected` : "Set in billing"}
          href={`${base}/billing`}
          accent={summary.unpaidInvoices > 0}
        />
        <HubMetric
          label="Selections"
          value={summary.selectionsPending}
          sub={
            summary.selectionsOverdue
              ? `${summary.selectionsOverdue} overdue`
              : "Pending decisions"
          }
          href={`${base}/selections`}
          accent={summary.selectionsOverdue > 0}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <div>
          <h3 className="eyebrow mb-4">Suggested next</h3>
          {summary.nextActions.length ? (
            <HubActionRow items={summary.nextActions} />
          ) : (
            <div className="hub-panel p-8 text-sm text-ink/50 italic">
              All caught up on this job. Post an update or review the schedule.
            </div>
          )}
        </div>

        <div className="hub-panel p-8">
          <span className="eyebrow">Client portal</span>
          {summary.clientName ? (
            <div className="mt-6 space-y-4">
              <div>
                <div className="font-medium text-ink text-lg">{summary.clientName}</div>
                <div className="text-sm text-ink/55 mt-1">{summary.clientEmail}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-ink/10">
                <div>
                  <div className="font-display text-xl">{summary.updateCount}</div>
                  <div className="text-[10px] font-mono uppercase text-stone-300 mt-1">Updates</div>
                </div>
                <div>
                  <div className="font-display text-xl">{summary.pendingChangeOrders}</div>
                  <div className="text-[10px] font-mono uppercase text-stone-300 mt-1">COs pending</div>
                </div>
                <div>
                  <div className="font-display text-xl">{summary.unpaidInvoices}</div>
                  <div className="text-[10px] font-mono uppercase text-stone-300 mt-1">Invoices due</div>
                </div>
              </div>
              <Link
                href={`/client/projects/${id}`}
                target="_blank"
                className="inline-flex h-11 items-center px-5 bg-ink text-bone font-mono text-[10px] tracking-[0.2em] uppercase hover:bg-copper transition-colors"
              >
                Preview client view ↗
              </Link>
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink/55 leading-relaxed">
              Assign a client in{" "}
              <Link href={`${base}/overview`} className="text-copper hover:underline">
                Overview
              </Link>{" "}
              to unlock portal access, selections approval, and online draw payments.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Schedule", href: `${base}/schedule`, value: project.target_completion_date ?? "—" },
          { label: "Daily logs", href: `${base}/daily-logs`, value: "Field notes" },
          { label: "Open bids", href: `${base}/bid-requests`, value: summary.openBidRequests },
          { label: "Punch items", href: `${base}/punch-list`, value: summary.openPunchItems },
        ].map((m) => (
          <Link key={m.href} href={m.href} className="hub-metric block hover:border-copper/40">
            <div className="eyebrow">{m.label}</div>
            <div className="text-sm text-ink mt-3 font-medium">{m.value}</div>
          </Link>
        ))}
      </div>

      {revisedContract > 0 && (
        <div className="mt-10 hub-panel p-6">
          <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-stone-300 mb-2">
            <span>Collected</span>
            <span>{budgetPct}% of ${revisedContract.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-bone overflow-hidden">
            <div
              className="h-full bg-copper transition-all duration-700"
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
