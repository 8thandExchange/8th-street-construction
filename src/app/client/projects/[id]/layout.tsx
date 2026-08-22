import Link from "next/link";
import { ClientProjectNav } from "@/components/client/ClientProjectNav";
import { ProjectFundingBadge } from "@/components/project/ProjectFundingBadge";
import { requireClientProjectAccess } from "@/lib/portal/access";
import { PORTAL_FEATURES, isFeatureEnabled } from "@/lib/portal/features";
import { EnableNotificationsButton } from "@/components/pwa/EnableNotificationsButton";
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
      <div className="z-20 border-b border-navy/[0.08] bg-white/95 backdrop-blur-md sm:sticky sm:top-16">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:px-10 lg:px-14">
          <Link
            href="/client"
            className="text-xs font-medium app-muted transition-colors hover:text-copper"
          >
            ← My Projects
          </Link>
          <h1 className="mt-2 app-h1 !text-[20px] md:!text-[22px]">
            {project.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ProjectFundingBadge
              fundingType={parseFundingType(project.funding_type)}
              slug={project.slug}
              hudGrantYear={project.hud_grant_year}
              size="md"
            />
            <EnableNotificationsButton />
          </div>
          {project.subtitle && (
            <p className="mt-1 text-ink/55 text-sm">{project.subtitle}</p>
          )}
          <div className="mt-4">
            <ClientProjectNav
              projectId={id}
              enabledHrefs={PORTAL_FEATURES.filter((f) =>
                isFeatureEnabled(project.portal_features, f.key)
              ).map((f) => f.href)}
            />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
