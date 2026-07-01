import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectHubShell } from "@/components/project-hub/ProjectHubShell";

export const dynamic = "force-dynamic";

export default async function ProjectHubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, slug, status, location, funding_type, hud_grant_year")
    .eq("id", id)
    .single();

  if (!project) notFound();

  return <ProjectHubShell project={project}>{children}</ProjectHubShell>;
}
