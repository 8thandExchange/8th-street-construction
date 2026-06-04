import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/StatCard";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/utils";
import { getComplianceDashboardAlerts } from "@/lib/compliance/compliance-reminders";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: newLeads }, { count: totalLeads }, { count: activeProjects }, { count: pendingConsults }, { data: recentLeads }, complianceAlerts, { data: activeJobs }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }).in("status", ["pre_construction", "in_progress"]),
      supabase.from("consultations").select("*", { count: "exact", head: true }).eq("status", "requested"),
      supabase
        .from("leads")
        .select("id, first_name, last_name, email, status, project_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      getComplianceDashboardAlerts(),
      supabase
        .from("projects")
        .select("id, title, status, playbook_applied_at")
        .in("status", ["pre_construction", "in_progress"])
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);

  return (
    <div className="p-8 md:p-12">
      <div className="mb-12">
        <span className="eyebrow">— Dashboard</span>
        <h1 className="mt-2 font-display text-display-md text-ink">Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard
          label="New Leads"
          value={newLeads ?? 0}
          hint="Awaiting response"
          href="/admin/leads?status=new"
          accent={(newLeads ?? 0) > 0}
        />
        <StatCard
          label="Pending Consultations"
          value={pendingConsults ?? 0}
          hint="Needs confirmation"
          href="/admin/consultations"
          accent={(pendingConsults ?? 0) > 0}
        />
        <StatCard
          label="Active Projects"
          value={activeProjects ?? 0}
          hint="In construction"
          href="/admin/projects"
        />
        <StatCard
          label="Total Leads"
          value={totalLeads ?? 0}
          hint="All time"
          href="/admin/leads"
        />
        <StatCard
          label="Compliance Alerts"
          value={complianceAlerts.length}
          hint="Licenses & insurance"
          href="/admin/compliance"
          accent={complianceAlerts.length > 0}
        />
      </div>

      {complianceAlerts.length > 0 && (
        <div className="mb-12 bg-paper border border-amber-200/80 p-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-xl text-ink">Renewals & Compliance</h2>
            <Link
              href="/admin/compliance"
              className="font-mono text-[11px] tracking-[0.18em] uppercase text-copper hover:text-copper-400"
            >
              Manage →
            </Link>
          </div>
          <ul className="divide-y divide-ink/10">
            {complianceAlerts.slice(0, 5).map((item) => (
              <li key={item.id} className="py-3 flex justify-between gap-4 text-sm">
                <span className="text-ink">{item.title}</span>
                <span
                  className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${
                    item.status === "expired" ? "text-red-700" : "text-amber-800"
                  }`}
                >
                  {item.status === "expired"
                    ? "Expired"
                    : item.days === 0
                      ? "Today"
                      : `${item.days}d left`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(activeJobs ?? []).length > 0 && (
        <div className="mb-12 hub-panel p-8">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-xl text-ink">Active jobs</h2>
            <Link href="/admin/projects" className="font-mono text-[11px] tracking-[0.18em] uppercase text-copper hover:text-copper-400">
              All projects →
            </Link>
          </div>
          <ul className="divide-y divide-ink/8">
            {activeJobs!.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/admin/projects/${job.id}`}
                  className="flex items-center justify-between py-4 hover:bg-bone/50 -mx-4 px-4 transition-colors group"
                >
                  <span className="font-medium text-ink group-hover:text-copper transition-colors">{job.title}</span>
                  <span className="text-[10px] font-mono uppercase text-stone-300">
                    {job.playbook_applied_at ? "Command →" : "Setup needed →"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-paper border border-ink/15 p-8">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl text-ink">Recent Leads</h2>
          <Link
            href="/admin/leads"
            className="font-mono text-[11px] tracking-[0.18em] uppercase text-copper hover:text-copper-400"
          >
            View All →
          </Link>
        </div>

        {recentLeads && recentLeads.length > 0 ? (
          <div className="divide-y divide-ink/10">
            {recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className="flex items-center justify-between py-4 hover:bg-bone/50 -mx-4 px-4 transition-colors"
              >
                <div>
                  <div className="font-medium text-ink">
                    {lead.first_name} {lead.last_name}
                  </div>
                  <div className="text-xs text-stone-300 font-mono tracking-wider mt-1">
                    {lead.email}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {lead.project_type && (
                    <span className="text-xs text-ink/60 font-mono tracking-wider hidden md:block">
                      {lead.project_type.replace(/_/g, " ")}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border ${
                      LEAD_STATUS_COLORS[lead.status]
                    }`}
                  >
                    {LEAD_STATUS_LABELS[lead.status]}
                  </span>
                  <span className="text-xs text-stone-300 font-mono">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-ink/50 italic">No leads yet. They'll show up here once the contact form starts getting submissions.</p>
        )}
      </div>
    </div>
  );
}
