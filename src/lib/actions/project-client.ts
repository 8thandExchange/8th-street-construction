"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { parseFundingType } from "@/lib/project/funding";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/overview`);
  revalidatePath(`/admin/projects/${projectId}/billing`);
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/client/projects/${projectId}`);
  revalidatePath("/client");
}

export async function assignProjectClient(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const clientId = String(formData.get("client_id") || "").trim() || null;
  const fundingType = parseFundingType(String(formData.get("funding_type")));
  const hudGrantYear = String(formData.get("hud_grant_year") || "").trim();
  const hudProgramNotes = String(formData.get("hud_program_notes") || "").trim() || null;
  const portalEnabled = formData.getAll("client_portal_enabled").includes("true");

  const payload: Record<string, unknown> = {
    client_id: clientId,
    funding_type: fundingType,
    client_portal_enabled: clientId ? portalEnabled : false,
    hud_grant_year: hudGrantYear ? Number(hudGrantYear) : null,
    hud_program_notes: fundingType === "hud_home" ? hudProgramNotes : null,
  };

  if (fundingType !== "hud_home") {
    payload.hud_grant_year = null;
    payload.hud_program_notes = null;
  }

  const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidateProject(projectId);
}

/** One-click: assign a known client org + its default funding + enable portal */
export async function assignClientOrg(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const clientOrgId = String(formData.get("client_org_id"));

  const { data: org } = await supabase
    .from("client_orgs")
    .select("name, email, default_funding, default_hud_notes")
    .eq("id", clientOrgId)
    .single();
  if (!org) throw new Error("Client organization not found.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", org.email)
    .single();

  if (!profile) {
    throw new Error(
      `${org.name} portal user (${org.email}) not found. Invite them under Admin → Portal Users.`
    );
  }

  const funding = parseFundingType(org.default_funding);
  const { error } = await supabase
    .from("projects")
    .update({
      client_id: profile.id,
      client_portal_enabled: true,
      funding_type: funding,
      hud_grant_year: funding === "hud_home" ? new Date().getFullYear() : null,
      hud_program_notes: funding === "hud_home" ? org.default_hud_notes : null,
    })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidateProject(projectId);
}

export async function clearProjectClient(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { error } = await supabase
    .from("projects")
    .update({
      client_id: null,
      client_portal_enabled: false,
      funding_type: "private",
      hud_grant_year: null,
      hud_program_notes: null,
    })
    .eq("id", projectId);

  if (error) throw new Error(error.message);

  await supabase.from("project_portal_members").delete().eq("project_id", projectId);

  revalidateProject(projectId);
}
