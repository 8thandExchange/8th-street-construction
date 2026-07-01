import Link from "next/link";
import { ClientProjectNav } from "@/components/client/ClientProjectNav";
import { ProjectFundingBadge } from "@/components/project/ProjectFundingBadge";
import { requireClientProjectAccess } from "@/lib/portal/access";
import { parseFundingType } from "@/lib/project/funding";

export const dynamic = "force-dynamic";

export default async function ClientProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project } = await requireClientProjectAccess(id);

  return (
    <div className="min-h-full">
      <div className="border-b border-ink/10 bg-bone/95 backdrop-blur-md sticky top-20 z-20">
        <div className="px-6 md:px-10 lg:px-14 py-6 max-w-7xl mx-auto">
          <Link
            href="/client"
            className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors"
          >
            ← My Projects
          </Link>
          <h1 className="mt-3 font-display text-2xl md:text-3xl text-ink leading-tight">
            {project.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ProjectFundingBadge
              fundingType={parseFundingType(project.funding_type)}
              slug={project.slug}
              hudGrantYear={project.hud_grant_year}
              size="md"
            />
          </div>
          {project.subtitle && (
            <p className="mt-1 text-ink/55 text-sm">{project.subtitle}</p>
          )}
          <div className="mt-5">
            <ClientProjectNav projectId={id} />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
