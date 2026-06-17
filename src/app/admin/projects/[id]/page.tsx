import Link from "next/link";
import { notFound } from "next/navigation";
import { loadProjectForHub } from "@/lib/data/project-hub";
import { loadJobMasterBoard } from "@/lib/data/company-dashboard";
import {
  HubAlertStrip,
  HubActionRow,
  ProgressRing,
  HubMetric,
} from "@/components/hub/HubUI";
import { CostComparisonPanel } from "@/components/costs/CostComparisonPanel";
import { computeProjectCostSummary } from "@/lib/estimate/summary";
import { formatMoney } from "@/lib/billing/constants";
import { PROJECT_STATUS_LABELS, TASK_STATUS_LABELS } from "@/lib/project/labels";
import { DRAW_STATUS_LABELS } from "@/lib/project/labels";

export const dynamic = "force-dynamic";

export default async function JobMasterBoardPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [hub, board] = await Promise.all([loadProjectForHub(id), loadJobMasterBoard(id)]);
  if (!hub || !board) notFound();

  const { project, summary } = hub;
  const base = `/admin/projects/${id}`;

  const costSummary = computeProjectCostSummary(
    Number(project.estimated_cost ?? 0),
    Number(project.contract_value ?? 0),
    board.estimateLines,
    board.awardedBids
  );

  return (
    <div className="max-w-6xl">
      <HubAlertStrip alerts={summary.alerts} />

      <div className="grid lg:grid-cols-[auto_1fr] gap-8 mb-10 items-center">
        <ProgressRing pct={board.progressPct} size={120} label="Done" />
        <div>
          <h2 className="font-display text-2xl text-ink">Job master board</h2>
          <p className="mt-2 text-ink/60 leading-relaxed max-w-2xl">
            One screen for <span className="text-ink font-medium">{project.title}</span> — what&apos;s
            done, what&apos;s next, and all three money buckets.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-mono uppercase text-stone-300">
            <span>{PROJECT_STATUS_LABELS[project.status] || project.status}</span>
            {project.street_address && (
              <>
                <span className="text-ink/15">·</span>
                <span>{project.street_address}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <CostComparisonPanel projectId={id} summary={costSummary} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
        <HubMetric
          label="Checklists"
          value={board.tasksTotal ? `${board.tasksDone}/${board.tasksTotal}` : "—"}
          sub={`${board.progressPct}% complete`}
          href={`${base}/tasks`}
        />
        <HubMetric
          label="Build phases"
          value={`${summary.milestoneCompleted}/${summary.milestoneTotal}`}
          sub="Client timeline steps"
          href={`${base}/build`}
        />
        <HubMetric
          label="Open punch items"
          value={board.openPunch}
          sub="Before handover"
          href={`${base}/punch-list`}
          accent={board.openPunch > 0}
        />
        <HubMetric
          label="Invoices waiting"
          value={board.unpaidInvoices}
          sub={board.paidToUs ? `${formatMoney(board.paidToUs)} collected` : "Nothing collected yet"}
          href={`${base}/billing`}
          accent={board.unpaidInvoices > 0}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <section>
          <div className="flex justify-between items-baseline mb-4">
            <h3 className="eyebrow">What to do next</h3>
            <Link href={`${base}/tasks`} className="font-mono text-[10px] uppercase text-copper">
              All checklists →
            </Link>
          </div>
          {summary.nextActions.length ? (
            <HubActionRow items={summary.nextActions} />
          ) : board.openTasks.length ? (
            <ul className="hub-panel divide-y divide-ink/8">
              {board.openTasks.map((t) => (
                <li key={t.id} className="px-5 py-4 flex justify-between gap-4 text-sm">
                  <span className="text-ink">{t.title}</span>
                  <span className="text-[10px] font-mono uppercase text-stone-300 shrink-0">
                    {TASK_STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="hub-panel p-8 text-sm text-ink/50 italic">
              All caught up on open tasks. Post a daily log or send the client an update.
            </div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-baseline mb-4">
            <h3 className="eyebrow">Build phase progress</h3>
            <Link href={`${base}/build`} className="font-mono text-[10px] uppercase text-copper">
              Build plan →
            </Link>
          </div>
          {board.phaseProgress.length ? (
            <ul className="space-y-2">
              {board.phaseProgress.map((p) => (
                <li key={p.phaseKey} className="hub-panel p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-ink">{p.title}</span>
                    <span className="font-mono text-xs text-stone-300">
                      {p.tasksDone}/{p.tasksTotal}
                    </span>
                  </div>
                  <div className="h-1.5 bg-bone overflow-hidden">
                    <div
                      className="h-full bg-copper"
                      style={{ width: `${p.tasksPct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="hub-panel p-8 text-sm text-ink/50">
              <Link href={`${base}/build`} className="text-copper hover:underline">
                Apply the build plan
              </Link>{" "}
              to get phase-by-phase tracking.
            </div>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <section>
          <div className="flex justify-between items-baseline mb-4">
            <h3 className="eyebrow">Client billing schedule</h3>
            <Link href={`${base}/billing`} className="font-mono text-[10px] uppercase text-copper">
              Money & invoices →
            </Link>
          </div>
          {board.draws.length ? (
            <ol className="hub-panel divide-y divide-ink/8">
              {board.draws.map((d) => (
                <li key={d.id} className="px-5 py-4 flex justify-between gap-4 text-sm">
                  <div>
                    <span className="font-mono text-xs text-stone-300">Payment {d.draw_number}</span>
                    <p className="text-ink mt-1">{d.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-lg">{formatMoney(Number(d.amount))}</p>
                    <p className="text-[10px] font-mono uppercase text-stone-300 mt-1">
                      {DRAW_STATUS_LABELS[d.status] ?? d.status}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="hub-panel p-8 text-sm text-ink/50">
              Set what Habitat pays you, then create the payment schedule in{" "}
              <Link href={`${base}/billing`} className="text-copper hover:underline">
                Money & Invoices
              </Link>
              .
            </div>
          )}
        </section>

        <section className="hub-panel p-6">
          <span className="eyebrow">Client portal</span>
          {board.client ? (
            <div className="mt-4 space-y-3">
              <p className="font-medium text-ink text-lg">
                {[board.client.first_name, board.client.last_name].filter(Boolean).join(" ") ||
                  board.client.email}
              </p>
              <p className="text-sm text-ink/55">{board.client.email}</p>
              <div className="flex flex-wrap gap-3 pt-4">
                <Link
                  href={`${base}/messages`}
                  className="h-10 px-4 border border-ink/20 font-mono text-[10px] uppercase hover:bg-ink hover:text-bone"
                >
                  Messages
                </Link>
                <Link
                  href={`${base}/updates`}
                  className="h-10 px-4 border border-ink/20 font-mono text-[10px] uppercase hover:bg-ink hover:text-bone"
                >
                  Post update
                </Link>
                <Link
                  href={`/client/projects/${id}`}
                  target="_blank"
                  className="h-10 px-4 bg-ink text-bone font-mono text-[10px] uppercase"
                >
                  Preview portal ↗
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink/55 leading-relaxed">
              Link Habitat Augusta (or the homeowner) in{" "}
              <Link href={`${base}/overview`} className="text-copper hover:underline">
                Job Details
              </Link>{" "}
              so they can see progress, messages, and invoices.
            </p>
          )}
        </section>
      </div>

      {board.recentLogs.length > 0 && (
        <section className="mb-10">
          <div className="flex justify-between items-baseline mb-4">
            <h3 className="eyebrow">Recent field notes</h3>
            <Link href={`${base}/daily-logs`} className="font-mono text-[10px] uppercase text-copper">
              Daily logs →
            </Link>
          </div>
          <ul className="hub-panel divide-y divide-ink/8">
            {board.recentLogs.map((log) => (
              <li key={log.id} className="px-5 py-4 text-sm">
                <span className="font-mono text-xs text-stone-300">{log.log_date}</span>
                <p className="text-ink/70 mt-1 line-clamp-2">{log.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Cost plan", href: `${base}/costs` },
          { label: "Sub quotes", href: `${base}/bid-requests` },
          { label: "Schedule", href: `${base}/schedule` },
          { label: "Files", href: `${base}/documents` },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="hub-metric block hover:border-copper/40">
            <div className="eyebrow">{link.label}</div>
            <div className="text-sm text-copper mt-3 font-mono text-[10px] uppercase">Open →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
