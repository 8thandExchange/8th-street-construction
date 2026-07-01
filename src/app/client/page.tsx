import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getClientVisibleProjects } from "@/lib/portal/access";
import { ProjectFundingBadge } from "@/components/project/ProjectFundingBadge";
import { parseFundingType } from "@/lib/project/funding";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pre_construction: "Pre-Construction",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  archived: "Archived",
};

export default async function ClientHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("portal_active")
    .eq("id", user!.id)
    .single();

  if (!profile?.portal_active) {
    return (
      <div className="px-6 md:px-10 lg:px-14 py-12 md:py-16 mx-auto max-w-7xl">
        <h1 className="font-display text-display-md text-ink">Portal access paused</h1>
        <p className="mt-4 text-base text-ink/70 max-w-2xl">
          Your portal account is not active right now. Contact your project manager at{" "}
          <a href="mailto:construction@8thandexchange.com" className="text-copper hover:underline">
            construction@8thandexchange.com
          </a>{" "}
          if you believe this is an error.
        </p>
      </div>
    );
  }

  const projects = await getClientVisibleProjects(user!.id);

  return (
    <div className="px-6 md:px-10 lg:px-14 py-12 md:py-16 mx-auto max-w-7xl">
      <span className="eyebrow">— Welcome</span>
      <h1 className="mt-2 font-display text-display-md text-ink">Your Projects</h1>
      <p className="mt-4 text-base text-ink/70 max-w-2xl">
        Real-time visibility into the projects we&apos;re building with you — timelines,
        milestones, photo updates, documents, and messages.
      </p>

      {projects.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/client/projects/${p.id}`}
              className="group block bg-paper border border-ink/15 p-8 hover:border-ink/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-4 gap-3">
                <span className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border border-copper/50 text-copper">
                  {STATUS_LABELS[p.status]}
                </span>
                <ProjectFundingBadge
                  fundingType={parseFundingType(p.funding_type)}
                  hudGrantYear={p.hud_grant_year}
                  size="sm"
                />
              </div>
              <h2 className="font-display text-2xl text-ink group-hover:text-copper transition-colors leading-snug">
                {p.title}
              </h2>
              {p.subtitle && <p className="mt-2 text-sm text-ink/70">{p.subtitle}</p>}
              {p.target_completion_date && (
                <div className="mt-6 pt-4 border-t border-ink/10 text-xs text-stone-300 font-mono">
                  Target completion: {new Date(p.target_completion_date).toLocaleDateString()}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-12 border border-ink/15 p-12 text-center bg-paper">
          <p className="text-ink/50 italic">
            No projects are shared with your account yet. Your builder will turn on portal access
            when your project is ready.
          </p>
          <a
            href="mailto:construction@8thandexchange.com"
            className="mt-6 inline-block text-sm text-copper editorial-link"
          >
            Questions? Email your project manager
          </a>
        </div>
      )}
    </div>
  );
}
