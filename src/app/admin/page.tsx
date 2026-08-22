import Link from "next/link";
import { loadCompanyDashboard } from "@/lib/data/company-dashboard";
import { formatMoney } from "@/lib/billing/constants";
import { PROJECT_STATUS_LABELS } from "@/lib/project/labels";
import { StatCard } from "@/components/admin/StatCard";
import { appStatusBadge } from "@/lib/project/status-badges";
import { ActionQueue } from "@/components/dashboard/ActionQueue";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { jobs, newLeads, pendingConsults, briefing, attention } =
    await loadCompanyDashboard();
  const assistantPrompts = [
    "Give me today’s operating brief — jobs, cash, and commitments",
    "Which jobs need attention, and why?",
    "What client money is outstanding or overdue?",
    "What commitments are blocked or past due?",
  ];

  return (
    <div className="max-w-7xl p-4 md:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="app-label">Operations</span>
          <h1 className="mt-2 app-h1 !text-[26px]">Company command center</h1>
          <p className="mt-2 max-w-2xl app-muted">
            The work, cash, and commitments that need a decision today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/assistant" className="app-btn app-btn-secondary">
            Ask Assistant
          </Link>
          <Link href="/admin/projects/new" className="app-btn app-btn-primary">
            New project
          </Link>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active jobs"
          value={jobs.length}
          hint={`${jobs.filter((job) => job.alertCount > 0).length} need attention`}
          href="/admin/projects"
          accent={jobs.some((job) => job.alertCount > 0)}
        />
        <StatCard
          label="Client receivables"
          value={formatMoney(briefing.receivables.openAmount)}
          hint={
            briefing.receivables.overdueCount
              ? `${formatMoney(briefing.receivables.overdueAmount)} overdue`
              : "Nothing overdue"
          }
          href="/admin/invoicing"
          accent={briefing.receivables.overdueCount > 0}
        />
        <StatCard
          label="Vendor payables"
          value={formatMoney(briefing.payables.openAmount)}
          hint={`${briefing.payables.openCount} open bill${
            briefing.payables.openCount === 1 ? "" : "s"
          }`}
          href="/admin/vendors"
          accent={briefing.payables.overdueCount > 0}
        />
        <StatCard
          label="Open commitments"
          value={briefing.commitments.openCount}
          hint={`${briefing.commitments.overdueCount} overdue · ${briefing.commitments.blockedCount} blocked`}
          href="/admin/meetings/action-items"
          accent={
            briefing.commitments.overdueCount > 0 || briefing.commitments.blockedCount > 0
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
        <section className="app-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/[0.08] px-5 py-4">
            <div>
              <h2 className="app-h2">Active jobs</h2>
              <p className="mt-1 text-xs app-muted">Progress, contract, collections, and risk.</p>
            </div>
            <Link href="/admin/projects" className="text-[13px] font-medium text-copper hover:underline">
              View all
            </Link>
          </div>
          {jobs.length === 0 ? (
            <div className="px-6 py-16 text-center app-muted">
              No active jobs.{" "}
              <Link href="/admin/projects/new" className="text-copper hover:underline">
                Start a project
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-navy/[0.06]">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/projects/${job.id}`}
                  className="group grid gap-4 px-5 py-5 transition-colors hover:bg-navy/[0.025] md:grid-cols-[minmax(180px,1fr)_140px_120px_120px] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[14px] font-semibold text-navy group-hover:text-copper">
                        {job.title}
                      </h3>
                      <span className={appStatusBadge("project", job.status)}>
                        {PROJECT_STATUS_LABELS[job.status] || job.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs app-muted">
                      {job.location || "Location not set"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="app-muted">Progress</span>
                      <span className="app-num font-medium text-navy">{job.progressPct}%</span>
                    </div>
                    <div className="app-meter mt-2">
                      <span style={{ width: `${job.progressPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="app-label">Contract</p>
                    <p className="app-num mt-1 font-medium text-navy">
                      {job.clientContract ? formatMoney(job.clientContract) : "Not set"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:block">
                    <div>
                      <p className="app-label">Collected</p>
                      <p className="app-num mt-1 font-medium text-navy">
                        {job.paidToUs ? formatMoney(job.paidToUs) : "$0"}
                      </p>
                    </div>
                    {job.alertCount > 0 && (
                      <span className="app-badge app-badge-amber md:mt-2">
                        {job.alertCount} alert{job.alertCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <ActionQueue
            actions={attention.map((item) => ({
              id: item.id,
              severity: item.severity,
              label: item.title,
              hint: item.detail,
              href: item.href,
            }))}
            title="Needs a decision"
            emptyTitle="Operations are clear"
            emptyDescription="No overdue cash, blocked commitments, or schedule exceptions."
          />

          <section className="app-card overflow-hidden">
            <div className="border-b border-navy/[0.08] px-5 py-4">
              <span className="app-label !text-copper">AI operations partner</span>
              <h2 className="mt-1 app-h2 !text-[16px]">Ask from the same live books</h2>
              <p className="mt-1 text-xs app-muted">
                It can read the brief, investigate a job, and prepare work for approval.
              </p>
            </div>
            <div className="divide-y divide-navy/[0.06]">
              {assistantPrompts.map((prompt) => (
                <Link
                  key={prompt}
                  href={`/admin/assistant?q=${encodeURIComponent(prompt)}`}
                  className="block px-5 py-3 text-[13px] leading-snug text-navy/80 transition-colors hover:bg-copper/[0.05] hover:text-copper"
                >
                  {prompt} <span aria-hidden>→</span>
                </Link>
              ))}
            </div>
          </section>

          {(newLeads > 0 || pendingConsults > 0) && (
            <section className="app-card p-5">
              <span className="app-label">Pipeline</span>
              <div className="mt-3 flex gap-3">
                <Link href="/admin/leads?status=new" className="app-inset flex-1 p-3">
                  <span className="app-num text-lg font-semibold text-navy">{newLeads}</span>
                  <span className="ml-2 text-xs app-muted">new leads</span>
                </Link>
                <Link href="/admin/consultations" className="app-inset flex-1 p-3">
                  <span className="app-num text-lg font-semibold text-navy">
                    {pendingConsults}
                  </span>
                  <span className="ml-2 text-xs app-muted">consults</span>
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
