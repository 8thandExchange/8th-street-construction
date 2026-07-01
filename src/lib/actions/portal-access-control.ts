"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidateAll(projectId?: string, userId?: string) {
  revalidatePath("/admin/users");
  revalidatePath("/client");
  if (userId) revalidatePath(`/admin/users/${userId}/access`);
  if (projectId) {
    revalidatePath(`/admin/projects/${projectId}/overview`);
    revalidatePath(`/client/projects/${projectId}`);
  }
}

/** Master portal switch for a user account */
export async function setProfilePortalActive(formData: FormData) {
  const { supabase } = await requireAdmin();
  const profileId = String(formData.get("profile_id"));
  const active = formData.getAll("portal_active").includes("true");

  const { error } = await supabase
    .from("profiles")
    .update({ portal_active: active })
    .eq("id", profileId);

  if (error) throw new Error(error.message);
  revalidateAll(undefined, profileId);
}

/** Toggle primary client portal access on a project (Phase A) */
export async function setProjectPrimaryPortalAccess(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const enabled = formData.getAll("client_portal_enabled").includes("true");

  const { error } = await supabase
    .from("projects")
    .update({ client_portal_enabled: enabled })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidateAll(projectId);
}

/** Toggle a user's access to a specific project (Phase B — works for primary + members) */
export async function setUserProjectPortalAccess(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const profileId = String(formData.get("profile_id"));
  const enabled = formData.getAll("portal_enabled").includes("true");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("Project not found");

  if (project.client_id === profileId) {
    const { error } = await supabase
      .from("projects")
      .update({ client_portal_enabled: enabled })
      .eq("id", projectId);
    if (error) throw new Error(error.message);
  } else {
    if (enabled) {
      const { error } = await supabase.from("project_portal_members").upsert(
        {
          project_id: projectId,
          profile_id: profileId,
          portal_enabled: true,
          granted_by: admin.id,
          granted_at: new Date().toISOString(),
        },
        { onConflict: "project_id,profile_id" }
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("project_portal_members")
        .update({ portal_enabled: false })
        .eq("project_id", projectId)
        .eq("profile_id", profileId);
      if (error) throw new Error(error.message);
    }
  }

  revalidateAll(projectId, profileId);
}

/** Add an additional portal member to a project */
export async function addProjectPortalMember(formData: FormData) {
  const { supabase, user: admin } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const profileId = String(formData.get("profile_id"));
  const enabled = formData.get("portal_enabled") !== "false";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .single();

  if (!profile || profile.role !== "client") {
    throw new Error("Only client-role users can be added as portal members.");
  }

  const { error } = await supabase.from("project_portal_members").upsert(
    {
      project_id: projectId,
      profile_id: profileId,
      portal_enabled: enabled,
      granted_by: admin.id,
      granted_at: new Date().toISOString(),
    },
    { onConflict: "project_id,profile_id" }
  );

  if (error) throw new Error(error.message);
  revalidateAll(projectId, profileId);
}

/** Remove an additional portal member (does not affect primary client_id) */
export async function removeProjectPortalMember(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const profileId = String(formData.get("profile_id"));

  const { error } = await supabase
    .from("project_portal_members")
    .delete()
    .eq("project_id", projectId)
    .eq("profile_id", profileId);

  if (error) throw new Error(error.message);
  revalidateAll(projectId, profileId);
}
