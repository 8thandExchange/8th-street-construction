import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectHubShell } from "@/components/project-hub/ProjectHubShell";
import { parseStaffScope, hubHrefsForScope, staffCanSeeProject, staffHas } from "@/lib/auth/staff-scope";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("staff_scope").eq("id", user.id).single()
    : { data: null };
  const staffScope = parseStaffScope(profile?.staff_scope);

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, slug, status, location, funding_type, hud_grant_year, project_manager_id, superintendent_id"
    )
    .eq("id", id)
    .single();

  if (!project) notFound();
  if (user && !staffCanSeeProject(staffScope, user.id, project)) notFound();

  return (
    <ProjectHubShell
      project={project}
      allowedHrefs={hubHrefsForScope(staffScope)}
      showFieldCapture={staffHas(staffScope, "field.write")}
    >
      {children}
    </ProjectHubShell>
  );
}
