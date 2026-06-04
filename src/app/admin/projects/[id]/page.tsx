import Link from "next/link";
import { loadProjectForHub } from "@/lib/data/project-hub";
import { StatCard } from "@/components/admin/StatCard";
import { notFound } from "next/navigation";
import { PROJECT_STATUS_LABELS } from "@/lib/project/labels";

export const dynamic = "force-dynamic";

export default async function ProjectCommandPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const data = await loadProjectForHub(id);
  if (!data) notFound();

  const { project, summary } = data;
  const base = `/admin/projects/${id}`;
  const progress =
    summary.milestoneTotal > 0
      ? Math.round((summary.milestoneCompleted / summary.milestoneTotal) * 100)
      : 0;

  return (
    <div className="max-w-6xl">
      <div className="mb-10">
        <p className="text-lg text-ink/70 max-w-2xl leading-relaxed">
          Your command center for{" "}
          <span className="text-ink font-medium">{project.title}</span>. Track timeline,
          share updates, documents, and change orders — all in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        <StatCard
          label="Build System"
          value={
            summary.playbookApplied
              ? `${summary.taskCompleted}/${summary.taskTotal}`
              : "Setup"
          }
          hint={
            summary.playbookApplied
              ? "Checklist tasks done"
              : "Apply GA playbook"
          }
          href={`${base}/build`}
          accent={!summary.playbookApplied}
        />
        <StatCard
          label="Timeline"
          value={`${summary.milestoneCompleted}/${summary.milestoneTotal}`}
          hint={summary.milestoneTotal ? `${progress}% complete` : "Add milestones"}
          href={`${base}/milestones`}
        />
        <StatCard
          label="Updates"
          value={summary.updateCount}
          hint="Progress posts"
          href={`${base}/updates`}
        />
        <StatCard
          label="Documents"
          value={summary.documentCount}
          hint="Contracts & plans"
          href={`${base}/documents`}
        />
        <StatCard
          label="Messages"
          value={summary.messageCount}
          hint="Portal thread"
          href={`${base}/messages`}
        />
        <StatCard
          label="Change Orders"
          value={summary.pendingChangeOrders}
          hint={
            summary.pendingChangeOrders
              ? "Awaiting client"
              : "None pending"
          }
          href={`${base}/change-orders`}
          accent={summary.pendingChangeOrders > 0}
        />
        <StatCard
          label="Status"
          value={PROJECT_STATUS_LABELS[project.status] || project.status}
          hint={summary.clientName || "No client assigned"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-navy text-bone p-8">
          <span className="eyebrow-copper">— Quick Actions</span>
          <ul className="mt-6 space-y-3">
            {[
              { href: `${base}/build`, label: "Build system & checklists" },
              { href: `${base}/tasks`, label: "Work phase checklists" },
              { href: `${base}/updates`, label: "Post a progress update" },
              { href: `${base}/change-orders`, label: "Create change order" },
              { href: `${base}/messages`, label: "Message client" },
              { href: `${base}/overview`, label: "Edit project details" },
            ].map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="flex items-center justify-between py-3 border-b border-bone/15 hover:text-copper transition-colors font-mono text-[11px] tracking-[0.15em] uppercase"
                >
                  {a.label}
                  <span>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-paper border border-ink/15 p-8">
          <span className="eyebrow">— Client Portal</span>
          {summary.clientName ? (
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-stone-300">
                  Client
                </div>
                <div className="text-ink font-medium mt-1">{summary.clientName}</div>
                {summary.clientEmail && (
                  <div className="text-sm text-ink/60">{summary.clientEmail}</div>
                )}
              </div>
              <Link
                href={`/client/projects/${id}`}
                target="_blank"
                className="inline-flex h-10 items-center px-4 border border-ink/30 font-mono text-[10px] tracking-[0.2em] uppercase hover:bg-ink hover:text-bone transition-colors"
              >
                Preview client view ↗
              </Link>
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink/50 italic">
              Assign a client in Overview to enable portal access.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
