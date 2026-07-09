import Link from "next/link";
import { ProjectHubNav } from "./ProjectHubNav";
import { PROJECT_STATUS_LABELS } from "@/lib/project/labels";
import { ProjectFundingBadge } from "@/components/project/ProjectFundingBadge";
import type { ProjectFundingType } from "@/lib/project/funding";

type ProjectHubShellProps = {
  project: {
    id: string;
    title: string;
    slug: string;
    status: string;
    location: string | null;
    funding_type?: ProjectFundingType | string | null;
    hud_grant_year?: number | null;
  };
  children: React.ReactNode;
};

export function ProjectHubShell({ project, children }: ProjectHubShellProps) {
  return (
    <div className="min-h-full">
      {/* Title block scrolls away; only the slim nav bar below stays pinned. */}
      <header className="border-b border-navy/[0.08] bg-white">
        <div className="px-4 md:px-8 lg:px-10 pt-6 pb-4">
          <Link
            href="/admin/projects"
            className="app-muted text-[13px] font-medium hover:text-copper transition-colors"
          >
            ← All Projects
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="mt-2 app-h1 !text-[26px]">{project.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs app-muted">
                <ProjectFundingBadge
                  fundingType={project.funding_type}
                  slug={project.slug}
                  hudGrantYear={project.hud_grant_year}
                  size="sm"
                />
                <span className="app-badge app-badge-neutral">
                  {PROJECT_STATUS_LABELS[project.status] || project.status}
                </span>
                {project.location && (
                  <>
                    <span className="text-ink/20">|</span>
                    <span>{project.location}</span>
                  </>
                )}
              </div>
            </div>
            {project.status !== "draft" && (
              <Link
                href={`/projects/${project.slug}`}
                target="_blank"
                className="app-btn app-btn-secondary"
              >
                View Live ↗
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="sticky top-14 lg:top-0 z-40 border-b border-navy/[0.08] bg-white">
        <div className="px-4 md:px-8 lg:px-10 py-2.5">
          <ProjectHubNav projectId={project.id} />
        </div>
      </div>
      <div className="px-4 md:px-8 lg:px-10 py-6 md:py-8">{children}</div>
    </div>
  );
}
