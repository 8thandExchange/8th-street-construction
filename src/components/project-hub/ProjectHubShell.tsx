import Link from "next/link";
import { ProjectHubNav } from "./ProjectHubNav";
import { PROJECT_STATUS_LABELS } from "@/lib/project/labels";

type ProjectHubShellProps = {
  project: {
    id: string;
    title: string;
    slug: string;
    status: string;
    location: string | null;
  };
  children: React.ReactNode;
};

export function ProjectHubShell({ project, children }: ProjectHubShellProps) {
  return (
    <div className="min-h-full">
      <header className="border-b border-ink/10 bg-paper/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 md:px-10 lg:px-12 pt-8 pb-4">
          <Link
            href="/admin/projects"
            className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink"
          >
            ← All Projects
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">— Project Command</span>
              <h1 className="mt-1 font-display text-display-md text-ink leading-tight">
                {project.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-mono tracking-wider text-stone-300">
                <span className="uppercase">
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
                className="inline-flex h-10 items-center px-4 border border-ink/30 text-ink hover:bg-ink hover:text-bone font-mono text-[11px] tracking-[0.2em] uppercase transition-colors"
              >
                View Live ↗
              </Link>
            )}
          </div>
          <div className="mt-6">
            <ProjectHubNav projectId={project.id} />
          </div>
        </div>
      </header>
      <div className="px-6 md:px-10 lg:px-12 py-8 md:py-10">{children}</div>
    </div>
  );
}
