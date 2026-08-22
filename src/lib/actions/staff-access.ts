"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/actions/admin-auth";
import { parseStaffScope, STAFF_SCOPES } from "@/lib/auth/staff-scope";

export async function setStaffScope(formData: FormData) {
  const { supabase, user } = await requireCapability("users.write");
  const profileId = String(formData.get("profile_id") ?? "");
  const scope = parseStaffScope(formData.get("staff_scope"));
  if (!profileId) throw new Error("Missing user");
  if (profileId === user.id && scope !== "full") {
    throw new Error("You cannot narrow your own login.");
  }
  if (!STAFF_SCOPES.includes(scope)) throw new Error("Unknown staff scope");

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .single();
  if (!target || target.role !== "admin") {
    throw new Error("Staff scopes only apply to admin logins");
  }

  const { error } = await supabase.from("profiles").update({ staff_scope: scope }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function assignJobOwners(formData: FormData) {
  const { supabase } = await requireCapability("users.write");
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) throw new Error("Missing project");
  const { error } = await supabase
    .from("projects")
    .update({
      project_manager_id: String(formData.get("project_manager_id") ?? "").trim() || null,
      superintendent_id: String(formData.get("superintendent_id") ?? "").trim() || null,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/overview`);
  revalidatePath("/admin/projects");
}
