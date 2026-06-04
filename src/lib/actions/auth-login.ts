"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

export type LoginResult = { ok: true } | { error: string };

/**
 * Invite-only login: only emails with an approved profile receive a magic link.
 * Supabase signup is disabled; shouldCreateUser is false as a second guard.
 */
export async function requestMagicLink(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const redirect = String(formData.get("redirect") || "/").trim();

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, role")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      error:
        "This portal is invitation-only. If you need access, contact us at hello@8thstreetconstruction.com.",
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

  if (error) {
    if (
      error.message.toLowerCase().includes("signups not allowed") ||
      error.message.toLowerCase().includes("user not found")
    ) {
      return {
        error:
          "Your account is not active yet. Ask your project manager to resend your invitation.",
      };
    }
    return { error: error.message };
  }

  return { ok: true };
}
