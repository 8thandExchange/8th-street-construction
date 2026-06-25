"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/brand/assets";
import {
  generateShareToken,
  hashSharePassword,
  shareCookieName,
  shareSessionValue,
  verifySharePassword,
} from "@/lib/share/password";

export type ShareSettings = {
  enabled: boolean;
  token: string | null;
  hasPassword: boolean;
  url: string | null;
  updatedAt: string | null;
};

export async function getProjectShareSettings(projectId: string): Promise<ShareSettings> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("projects")
    .select("share_token, share_password_hash, share_enabled, share_updated_at")
    .eq("id", projectId)
    .single();

  const token = data?.share_token ?? null;
  return {
    enabled: Boolean(data?.share_enabled),
    token,
    hasPassword: Boolean(data?.share_password_hash),
    url: token ? `${getSiteUrl()}/share/${token}` : null,
    updatedAt: data?.share_updated_at ?? null,
  };
}

/** Enable sharing: ensures a token exists and (re)sets the access password. */
export async function enableProjectShare(formData: FormData) {
  await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const password = String(formData.get("share_password") || "").trim();

  if (password.length < 4) {
    throw new Error("Choose an access code of at least 4 characters.");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("projects")
    .select("share_token")
    .eq("id", projectId)
    .single();

  const token = existing?.share_token || generateShareToken();

  await admin
    .from("projects")
    .update({
      share_token: token,
      share_password_hash: hashSharePassword(password),
      share_enabled: true,
      share_updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  revalidatePath(`/admin/projects/${projectId}/schedule`);
}

/** Update only the password (keeps the same link). */
export async function updateSharePassword(formData: FormData) {
  await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const password = String(formData.get("share_password") || "").trim();

  if (password.length < 4) {
    throw new Error("Choose an access code of at least 4 characters.");
  }

  const admin = createAdminClient();
  await admin
    .from("projects")
    .update({
      share_password_hash: hashSharePassword(password),
      share_updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  revalidatePath(`/admin/projects/${projectId}/schedule`);
}

/** Generate a fresh token, invalidating the old link. */
export async function regenerateShareLink(formData: FormData) {
  await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const admin = createAdminClient();
  await admin
    .from("projects")
    .update({ share_token: generateShareToken(), share_updated_at: new Date().toISOString() })
    .eq("id", projectId);

  revalidatePath(`/admin/projects/${projectId}/schedule`);
}

export async function disableProjectShare(formData: FormData) {
  await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const admin = createAdminClient();
  await admin
    .from("projects")
    .update({ share_enabled: false, share_updated_at: new Date().toISOString() })
    .eq("id", projectId);

  revalidatePath(`/admin/projects/${projectId}/schedule`);
}

/** Public: verify the access code for a share token and set a scoped cookie. */
export async function submitSharePassword(
  _prev: { error: string | null } | undefined,
  formData: FormData
): Promise<{ error: string | null }> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");

  if (!token) return { error: "Invalid link." };

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("share_password_hash, share_enabled")
    .eq("share_token", token)
    .maybeSingle();

  if (!project || !project.share_enabled || !project.share_password_hash) {
    return { error: "This progress link is not available." };
  }

  if (!verifySharePassword(password, project.share_password_hash)) {
    return { error: "That access code is incorrect." };
  }

  const cookieStore = await cookies();
  cookieStore.set(shareCookieName(token), shareSessionValue(token, project.share_password_hash), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: `/share/${token}`,
    maxAge: 60 * 60 * 24 * 30,
  });

  return { error: null };
}
