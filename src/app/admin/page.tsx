import Link from "next/link";
import { loadCompanyDashboard } from "@/lib/data/company-dashboard";
import { formatMoney } from "@/lib/billing/constants";
import { PROJECT_STATUS_LABELS } from "@/lib/project/labels";
import { StatCard } from "@/components/admin/StatCard";
import { ProgressRing } from "@/components/hub/HubUI";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { jobs, complianceAlerts, newLeads, pendingConsults } = await loadCompanyDashboard();

  const totalAlerts = jobs.reduce((s, j) => s + j.alertCount, 0) + complianceAlerts.length;

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-6xl">
      <div className="mb-10">
        <span className="eyebrow">— Good morning</span>
        <h1 className="mt-2 app-h1">Company Home</h1>
        <p className="mt-3 app-muted max-w-2xl leading-relaxed">
          Every active job at a glance. Tap a job to open its master board — checklists, money, and
          what needs attention today.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
        <StatCard
          label="Active Jobs"
          value={jobs.length}
          hint="Homes in progress"
          href="/admin/projects"
        />
        <StatCard
          label="Needs Attention"
          value={totalAlerts}
          hint="Across all jobs + licenses"
          accent={totalAlerts > 0}
          href={complianceAlerts.length ? "/admin/compliance" : "/admin/projects"}
        />
        <StatCard
          label="New Leads"
          value={newLeads}
          hint="From the website"
          href="/admin/leads?status=new"
          accent={newLeads > 0}
        />
        <StatCard
          label="Consult Requests"
          value={pendingConsults}
          hint="Need a call back"
          href="/admin/consultations"
          accent={pendingConsults > 0}
        />
      </div>

      {complianceAlerts.length > 0 && (
        <div className="hub-panel p-6 mb-10 border-amber-200/80">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="app-h2">Licenses & insurance</h2>
            <Link href="/admin/compliance" className="app-label !text-copper">
              Manage →
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {complianceAlerts.slice(0, 4).map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>{item.title}</span>
                <span className={`shrink-0 ${item.status === "expired" ? "app-badge app-badge-red" : "app-badge app-badge-amber"}`}>
                  {item.status === "expired" ? "Expired" : `${item.days}d left`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 flex justify-between items-baseline">
        <h2 className="app-h1 !text-[18px]">Active jobs</h2>
        <Link href="/admin/projects" className="app-label !text-copper">
          All projects →
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="hub-panel py-16 text-center app-muted">
          No active jobs.{" "}
          <Link href="/admin/projects/new" className="text-copper hover:underline">
            Start a project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/admin/projects/${job.id}`}
              className="hub-panel p-6 md:p-8 block hover:border-copper/40 transition-colors group"
            >
              <div className="flex flex-wrap gap-6 md:gap-10 items-start">
                <ProgressRing pct={job.progressPct} size={88} label="Done" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="app-h2 !text-[16px] group-hover:text-copper transition-colors">
                      {job.title}
                    </h3>
                    <span className="app-label">
                      {PROJECT_STATUS_LABELS[job.status] || job.status}
                    </span>
                    {job.alertCount > 0 && (
                      <span className="app-badge app-badge-amber">
                        {job.alertCount} need{job.alertCount === 1 ? "s" : ""} attention
                      </span>
                    )}
                  </div>
                  {job.location && (
                    <p className="text-sm app-muted mt-1">{job.location}</p>
                  )}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="app-label">Checklists</p>
                      <p className="font-medium text-ink mt-0.5">
                        {job.tasksTotal ? `${job.tasksDone}/${job.tasksTotal}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="app-label">Our cost plan</p>
                      <p className="font-medium text-ink mt-0.5">
                        {job.estimatedCost ? formatMoney(job.estimatedCost) : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="app-label">Client pays us</p>
                      <p className="font-medium text-ink mt-0.5">
                        {job.clientContract ? formatMoney(job.clientContract) : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="app-label">Collected</p>
                      <p className="font-medium text-ink mt-0.5">
                        {job.paidToUs ? formatMoney(job.paidToUs) : "$0"}
                      </p>
                    </div>
                  </div>
                </div>
                <span className="app-label !text-copper shrink-0 self-center">
                  Open master board →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-navy/[0.08]">
        <Link href="/admin/leads" className="app-label !text-copper">
          Sales: leads & consultations →
        </Link>
      </div>
    </div>
  );
}
