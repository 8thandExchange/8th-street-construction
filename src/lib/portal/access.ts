import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export type ClientProjectRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: string;
  target_completion_date: string | null;
  location: string | null;
  start_date: string | null;
  funding_type: string | null;
  hud_grant_year: number | null;
};

/** Load all projects visible to the signed-in client (primary + member access). */
export async function getClientVisibleProjects(userId: string): Promise<ClientProjectRow[]> {
  const supabase = await createClient();

  const [{ data: primary }, { data: memberRows }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, slug, title, subtitle, status, target_completion_date, location, start_date, funding_type, hud_grant_year"
      )
      .eq("client_id", userId)
      .eq("client_portal_enabled", true)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_portal_members")
      .select(
        "project:projects(id, slug, title, subtitle, status, target_completion_date, location, start_date, funding_type, hud_grant_year)"
      )
      .eq("profile_id", userId)
      .eq("portal_enabled", true),
  ]);

  const map = new Map<string, ClientProjectRow>();

  for (const p of primary ?? []) {
    map.set(p.id, p as ClientProjectRow);
  }

  for (const row of memberRows ?? []) {
    const raw = row.project;
    const p = (Array.isArray(raw) ? raw[0] : raw) as ClientProjectRow | null;
    if (p && p.status !== "archived") map.set(p.id, p);
  }

  return [...map.values()];
}

/** Verify client portal access; calls notFound() when denied. */
export async function requireClientProjectAccess(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, portal_active, email, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.portal_active) notFound();

  const { data: allowed } = await supabase.rpc("client_has_project_portal_access", {
    project_uuid: projectId,
  });

  if (!allowed) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  return { supabase, user, profile, project };
}

/** Check access without throwing — for conditional UI. */
export async function clientHasProjectAccess(
  userId: string,
  projectId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("portal_active, role")
    .eq("id", userId)
    .single();

  if (!profile?.portal_active || profile.role !== "client") return false;

  const { data: allowed } = await supabase.rpc("client_has_project_portal_access", {
    project_uuid: projectId,
  });

  return Boolean(allowed);
}
