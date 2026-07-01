"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import {
  parseFundingType,
  type ProjectFundingType,
  KNOWN_CLIENT_ORGS,
} from "@/lib/project/funding";

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

/** One-click: assign Habitat Augusta + HUD HOME funding + enable portal */
export async function assignHabitatHudHome(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const org = KNOWN_CLIENT_ORGS[0];

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", org.email)
    .single();

  if (!profile) {
    throw new Error(
      `Habitat portal user (${org.email}) not found. Invite them under Admin → Portal Users.`
    );
  }

  const { error } = await supabase
    .from("projects")
    .update({
      client_id: profile.id,
      client_portal_enabled: true,
      funding_type: "hud_home" satisfies ProjectFundingType,
      hud_grant_year: new Date().getFullYear(),
      hud_program_notes: HUD_DEFAULT_NOTES,
    })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidateProject(projectId);
}

const HUD_DEFAULT_NOTES =
  "Augusta-Richmond County HOME / DCA CHIP — income-eligible homebuyer, EER, Section 3, sweat equity.";

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
