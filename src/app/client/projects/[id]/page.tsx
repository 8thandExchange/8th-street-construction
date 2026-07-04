import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadClientCommandCenter } from "@/lib/data/project-dashboard";
import { CommandCenterHero } from "@/components/dashboard/CommandCenterHero";
import { ActionQueue } from "@/components/dashboard/ActionQueue";
import { BudgetWaterfall } from "@/components/dashboard/BudgetWaterfall";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ScheduleStrip } from "@/components/dashboard/ScheduleStrip";
import { PhotoGalleryStrip } from "@/components/dashboard/PhotoGalleryStrip";
import { formatMoney } from "@/lib/billing/constants";

export const dynamic = "force-dynamic";

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending: "border-stone-300 text-stone-300",
  in_progress: "border-copper/50 text-copper bg-copper/5",
  completed: "border-emerald-500/50 text-emerald-600 bg-emerald-50",
  blocked: "border-amber-500/50 text-amber-600",
};

export default async function ClientProjectDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, location, subtitle, start_date, target_completion_date, contract_value")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const dashboard = await loadClientCommandCenter(project.id);
  if (!dashboard) notFound();

  const base = `/client/projects/${project.id}`;

  const daysToCompletion = project.target_completion_date
    ? Math.ceil(
        (new Date(`${project.target_completion_date}T12:00:00`).getTime() - Date.now()) /
          86_400_000
      )
    : null;

  const heroStats = [
    {
      label: "Phases",
      value: `${dashboard.completedPhases}/${dashboard.totalPhases}`,
    },
    ...(daysToCompletion !== null && daysToCompletion > 0
      ? [{ label: "Days to go", value: daysToCompletion, accent: true }]
      : []),
    {
      label: "Updates",
      value: dashboard.updateCount,
    },
    {
      label: "Documents",
      value: dashboard.documentCount,
    },
    ...(dashboard.billingSummary.revisedContract > 0
      ? [
          {
            label: "Paid",
            value: formatMoney(dashboard.billingSummary.paid),
            accent: dashboard.billingSummary.paid > 0,
          },
        ]
      : []),
  ];

  const inProgressMilestone = dashboard.milestones.find((m) => m.status === "in_progress");

  return (
    <div className="px-6 md:px-10 lg:px-14 py-8 md:py-10">
      <CommandCenterHero
        variant="client"
        title={project.title}
        subtitle={
          inProgressMilestone
            ? `Currently: ${inProgressMilestone.title}`
            : project.subtitle ?? undefined
        }
        progressPct={dashboard.progressPct}
        progressLabel="Timeline"
        stats={heroStats}
        actions={[
          ...(dashboard.actions.length > 0
            ? [{ label: "Take action", href: dashboard.actions[0].href, primary: true }]
            : []),
          { label: "Messages", href: `${base}/messages` },
        ]}
        meta={
          project.target_completion_date ? (
            <p className="text-xs font-mono text-bone/45 uppercase tracking-wider">
              Target completion{" "}
              {new Date(project.target_completion_date + "T12:00:00").toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          ) : undefined
        }
      />

      <div className="mb-6">
        <ActionQueue actions={dashboard.actions} />
      </div>

      {dashboard.photos.length > 0 && (
        <div className="mb-6">
          <PhotoGalleryStrip photos={dashboard.photos} href={`${base}/updates`} />
        </div>
      )}

      <div
        className={`grid gap-6 mb-6 ${
          dashboard.billingSummary.revisedContract > 0 ? "lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {dashboard.billingSummary.revisedContract > 0 && (
          <BudgetWaterfall
            projectId={project.id}
            cost={{
              estimatedCost: 0,
              awardedBids: 0,
              clientContract: dashboard.billingSummary.revisedContract,
              estimateVsAwarded: 0,
              clientVsEstimate: 0,
              linesWithBids: 0,
              lineCount: 0,
            }}
            billing={dashboard.billingSummary}
            variant="client"
          />
        )}

        <ActivityFeed
          activities={dashboard.activities}
          title="What's new"
          viewAllHref={`${base}/updates`}
          emptyMessage="Progress photos, messages, and milestone updates will appear here as your home takes shape."
        />
      </div>

      <div className="mb-6">
        <ScheduleStrip
          milestones={dashboard.milestones}
          href={`${base}/schedule`}
          title="Your timeline"
          maxItems={8}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 dash-panel p-8">
          <div className="flex justify-between items-baseline mb-6">
            <h2 className="font-display text-xl text-ink">Phase details</h2>
            <Link
              href={`${base}/schedule`}
              className="font-mono text-[10px] uppercase tracking-[0.15em] text-copper hover:underline"
            >
              Full schedule →
            </Link>
          </div>
          {dashboard.milestones.length > 0 ? (
            <ol className="space-y-3">
              {dashboard.milestones.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`${base}/schedule`}
                    className="flex gap-4 p-4 border border-ink/8 hover:border-copper/30 transition-colors group"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        m.status === "completed"
                          ? "bg-emerald-500"
                          : m.status === "in_progress"
                            ? "bg-copper"
                            : "bg-stone-300"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-ink group-hover:text-copper transition-colors">
                          {m.title}
                        </h3>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border ${MILESTONE_STATUS_COLORS[m.status] ?? MILESTONE_STATUS_COLORS.pending}`}
                        >
                          {m.status.replace("_", " ")}
                        </span>
                      </div>
                      {m.target_date && (
                        <div className="text-xs text-stone-300 font-mono mt-1">
                          Target{" "}
                          {new Date(m.target_date + "T12:00:00").toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-ink/50 italic text-sm">
              Your timeline will appear here as phases are published.
            </p>
          )}
        </section>

        <div className="space-y-6">
          <div className="dash-panel p-6">
            <h2 className="eyebrow mb-4">Project details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-mono uppercase text-stone-300">Location</dt>
                <dd className="text-ink mt-1">{project.location || "—"}</dd>
              </div>
              {project.start_date && (
                <div>
                  <dt className="text-[10px] font-mono uppercase text-stone-300">Started</dt>
                  <dd className="text-ink mt-1">
                    {new Date(project.start_date + "T12:00:00").toLocaleDateString()}
                  </dd>
                </div>
              )}
              {project.target_completion_date && (
                <div>
                  <dt className="text-[10px] font-mono uppercase text-stone-300">Target completion</dt>
                  <dd className="text-ink mt-1">
                    {new Date(project.target_completion_date + "T12:00:00").toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="dash-panel p-6">
            <h2 className="eyebrow mb-4">Quick links</h2>
            <ul className="space-y-2 text-sm">
              {[
                { label: "Billing", href: `${base}/billing` },
                { label: "Documents", href: `${base}/documents` },
                { label: "Selections", href: `${base}/selections` },
                { label: "Change orders", href: `${base}/change-orders` },
                { label: "Punch list", href: `${base}/punch-list` },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex justify-between items-center py-2 text-ink hover:text-copper transition-colors group"
                  >
                    {link.label}
                    <span className="text-stone-300 group-hover:text-copper">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
