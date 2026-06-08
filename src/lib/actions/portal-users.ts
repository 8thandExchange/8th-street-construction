"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionPortalUser } from "@/lib/auth/portal-access";

function revalidate() {
  revalidatePath("/admin/users");
}

export async function invitePortalUser(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") || "client");
  const firstName = String(formData.get("first_name") || "").trim() || null;
  const lastName = String(formData.get("last_name") || "").trim() || null;

  if (!email.includes("@")) return { error: "Valid email is required." };
  if (role !== "client" && role !== "subcontractor" && role !== "admin") {
    return { error: "Invalid role." };
  }

  const result = await provisionPortalUser({
    email,
    role: role as "admin" | "client" | "subcontractor",
    firstName,
    lastName,
  });

  if ("error" in result && result.error) return { error: result.error };
  revalidate();
  return { ok: true, tempPassword: result.tempPassword };
}

export async function removePortalUser(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("id", id)
    .single();

  if (!profile) return { error: "User not found." };
  if (profile.role === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return { error: "Cannot remove the only admin account." };
    }
  }

  await admin.from("profiles").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);

  revalidate();
  return { ok: true };
}

export async function resetPortalPassword(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("email, role, first_name")
    .eq("id", id)
    .single();

  if (!profile?.email) return { error: "User not found." };

  const result = await provisionPortalUser({
    email: profile.email,
    role: profile.role as "admin" | "client" | "subcontractor",
    firstName: profile.first_name,
    sendEmail: true,
  });

  if ("error" in result && result.error) return { error: result.error };
  revalidate();
  return { ok: true, tempPassword: result.tempPassword };
}

/** @deprecated Use resetPortalPassword — kept for any stale forms */
export async function resendPortalInvite(formData: FormData) {
  return resetPortalPassword(formData);
}
