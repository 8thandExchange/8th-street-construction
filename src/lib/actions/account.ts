"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PasswordChangeResult = { ok: true; redirectTo: string } | { error: string };

export async function changePassword(formData: FormData): Promise<PasswordChangeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!newPassword || newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile?.email) return { error: "Profile not found." };

  if (!profile.must_change_password) {
    if (!currentPassword) return { error: "Enter your current password." };
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });
    if (verifyErr) return { error: "Current password is incorrect." };
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updateErr) return { error: updateErr.message };

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  revalidatePath("/admin");
  revalidatePath("/client");
  revalidatePath("/subs");

  let redirectTo = "/";
  if (profile.role === "admin") redirectTo = "/admin";
  else if (profile.role === "client") redirectTo = "/client";
  else if (profile.role === "subcontractor") redirectTo = "/subs";

  return { ok: true, redirectTo };
}
