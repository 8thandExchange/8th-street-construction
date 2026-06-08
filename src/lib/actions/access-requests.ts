"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionPortalUser } from "@/lib/auth/portal-access";
import type { UserRole } from "@/types/database";

function revalidate() {
  revalidatePath("/admin/users");
}

export async function approveAccessRequest(formData: FormData) {
  const { user } = await requireAdmin();
  const id = String(formData.get("id"));
  const roleOverride = String(formData.get("role") || "").trim() as UserRole | "";

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("portal_access_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request || request.status !== "pending") {
    return { error: "Request not found or already reviewed." };
  }

  const role = (roleOverride || request.requested_role) as UserRole;
  const result = await provisionPortalUser({
    email: request.email,
    role,
    firstName: request.first_name,
    lastName: request.last_name,
  });

  if ("error" in result && result.error) return { error: result.error };

  await admin
    .from("portal_access_requests")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id);

  revalidate();
  return { ok: true, tempPassword: result.tempPassword };
}

export async function denyAccessRequest(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = String(formData.get("id"));

  await supabase
    .from("portal_access_requests")
    .update({
      status: "denied",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id);

  revalidate();
  return { ok: true };
}
