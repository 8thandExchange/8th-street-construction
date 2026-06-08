"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalKind } from "@/lib/portal-links";
import { accessRequestNotificationEmail } from "@/lib/email/templates/access-request";
import { Resend } from "resend";
import type { UserRole } from "@/types/database";

const TO_LEADS = process.env.EMAIL_TO_LEADS || "construction@8thandexchange.com";
const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";

export type LoginResult = { ok: true; redirectTo: string } | { error: string };
export type AccessRequestResult = { ok: true } | { error: string };

function roleRedirect(role: UserRole, requested: string) {
  if (requested && requested !== "/") {
    if (requested.startsWith("/admin") && role !== "admin") return "/";
    if (requested.startsWith("/subs") && role !== "subcontractor" && role !== "admin") return "/";
    if (requested.startsWith("/client") && role !== "client" && role !== "admin") return "/";
    return requested;
  }
  if (role === "admin") return "/admin";
  if (role === "subcontractor") return "/subs";
  if (role === "client") return "/client";
  return "/";
}

function requestedRoleFromRedirect(redirect: string): UserRole {
  const kind = getPortalKind(redirect);
  if (kind === "admin") return "admin";
  if (kind === "subcontractor") return "subcontractor";
  return "client";
}

/**
 * Email + password sign-in for approved portal users.
 */
export async function signInWithPassword(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirect") || "/").trim();

  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (!password) return { error: "Enter your password." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, role, must_change_password")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      error:
        "No account found for this email. Use Request Access below or contact hello@8thstreetconstruction.com.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login")) {
      return { error: "Incorrect email or password." };
    }
    return { error: error.message };
  }

  if (profile.must_change_password) {
    return { ok: true, redirectTo: "/account/password" };
  }

  return { ok: true, redirectTo: roleRedirect(profile.role, redirectTo) };
}

/**
 * Invite-only fallback: magic link for users who prefer email sign-in.
 */
export async function requestMagicLink(formData: FormData): Promise<AccessRequestResult> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const redirect = String(formData.get("redirect") || "/").trim();
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

  if (!email.includes("@")) return { error: "Enter a valid email address." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      error: "No account found. Use Request Access or ask your project manager to grant access.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: profile.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${SITE}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
    },
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export async function requestPortalAccess(formData: FormData): Promise<AccessRequestResult> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const firstName = String(formData.get("first_name") || "").trim() || null;
  const lastName = String(formData.get("last_name") || "").trim() || null;
  const message = String(formData.get("message") || "").trim() || null;
  const redirect = String(formData.get("redirect") || "/client").trim();
  const requestedRole = requestedRoleFromRedirect(redirect);

  if (!email.includes("@")) return { error: "Enter a valid email address." };

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile) {
    return {
      error: "An account already exists for this email. Try signing in or use Forgot password.",
    };
  }

  const { data: pending } = await admin
    .from("portal_access_requests")
    .select("id")
    .ilike("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) {
    return { error: "You already have a pending access request. We'll be in touch soon." };
  }

  const { error } = await admin.from("portal_access_requests").insert({
    email,
    first_name: firstName,
    last_name: lastName,
    requested_role: requestedRole,
    portal_path: redirect,
    message,
  });

  if (error) return { error: error.message };

  const key = process.env.RESEND_API_KEY;
  if (key) {
    const resend = new Resend(key);
    const { subject, html, text } = accessRequestNotificationEmail({
      email,
      firstName,
      lastName,
      requestedRole,
      message,
    });
    await resend.emails.send({
      from: FROM,
      to: TO_LEADS,
      replyTo: email,
      subject,
      html,
      text,
    });
  }

  return { ok: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
