"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

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

  const redirectPath =
    role === "admin" ? "/admin" : role === "client" ? "/client" : "/subs";

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, email, role")
    .ilike("email", email)
    .maybeSingle();

  let userId = existingProfile?.id;

  if (!userId) {
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${SITE}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
      }
    );

    if (inviteErr) {
      const msg = inviteErr.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = listed?.users?.find((u) => u.email?.toLowerCase() === email);
        if (!found) return { error: inviteErr.message };
        userId = found.id;
      } else {
        return { error: inviteErr.message };
      }
    } else {
      userId = invited.user?.id;
    }
  }

  if (!userId) return { error: "Could not create or find user." };

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      role,
      first_name: firstName,
      last_name: lastName,
    },
    { onConflict: "id" }
  );

  if (profileErr) return { error: profileErr.message };

  revalidatePath("/admin/users");
  return { ok: true };
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

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resendPortalInvite(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("email, role")
    .eq("id", id)
    .single();

  if (!profile?.email) return { error: "User not found." };

  const redirectPath =
    profile.role === "admin"
      ? "/admin"
      : profile.role === "client"
        ? "/client"
        : "/subs";

  const { error } = await admin.auth.admin.inviteUserByEmail(profile.email, {
    redirectTo: `${SITE}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
