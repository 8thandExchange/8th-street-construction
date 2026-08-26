import { createAdminClient } from "@/lib/supabase/admin";
import { generateTemporaryPassword } from "@/lib/auth/password";
import { portalCredentialsEmail } from "@/lib/email/templates/portal-credentials";
import { Resend } from "resend";
import type { UserRole } from "@/types/database";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";
const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";

function loginPathForRole(role: UserRole) {
  if (role === "admin") return "/login?redirect=/admin";
  if (role === "subcontractor") return "/login?redirect=/subs";
  return "/login?redirect=/client";
}

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Whether the credentials actually reached the person. Provisioning can
 * succeed while delivery fails, and those are different outcomes — an
 * admin who is told "sent" has no reason to hand the password over.
 */
export type CredentialsEmailOutcome =
  | { status: "sent" }
  | { status: "failed"; reason: string }
  | { status: "not-requested" };

/**
 * What every "hand somebody a password" action returns. Shared so the admin
 * UI can render one outcome for all three without re-deriving the shape.
 */
export type ProvisionActionResult =
  | { error: string }
  | { ok: true; tempPassword: string; email: CredentialsEmailOutcome };

/**
 * Declared rather than inferred: an inferred union gets normalised so the
 * success branch carries `error?: undefined`, and then `"error" in result`
 * fails to narrow it away — which silently widened every caller's types.
 */
export type ProvisionPortalUserResult =
  | { error: string }
  | {
      ok: true;
      userId: string;
      tempPassword: string;
      email: CredentialsEmailOutcome;
      loginUrl: string;
    };

export async function sendPortalCredentialsEmail(payload: {
  to: string;
  firstName: string;
  tempPassword: string;
  role: UserRole;
}): Promise<CredentialsEmailOutcome> {
  const client = resendClient();
  if (!client) return { status: "failed", reason: "RESEND_API_KEY is not configured" };

  const { subject, html, text } = portalCredentialsEmail({
    firstName: payload.firstName,
    email: payload.to,
    tempPassword: payload.tempPassword,
    role: payload.role,
    loginPath: loginPathForRole(payload.role),
  });

  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: payload.to,
      subject,
      html,
      text,
    });
    if (error) return { status: "failed", reason: error.message };
  } catch (err) {
    return {
      status: "failed",
      reason: err instanceof Error ? err.message : "Unknown mailer error",
    };
  }

  return { status: "sent" };
}

/**
 * Prove a login actually works: attempt a real password sign-in with the
 * public anon key (stateless — no cookies touched).
 */
export async function verifyPortalLogin(email: string, password: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  const { createClient } = await import("@supabase/supabase-js");
  const probe = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await probe.auth.signInWithPassword({ email, password });
  if (data.session) await probe.auth.signOut({ scope: "local" }).catch(() => {});
  return !error && Boolean(data.session);
}

export async function provisionPortalUser(input: {
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  sendEmail?: boolean;
  /** Explicit starting password; a temporary one is generated when omitted */
  password?: string;
  /** Force a password change at first login (defaults to true only for generated passwords) */
  forcePasswordChange?: boolean;
  /**
   * What to do when the email already has an account. "reject" (the invite
   * flows) refuses instead of silently resetting the person's password —
   * inviting an existing address must never become a takeover. "reset" is for
   * the explicit password-reset action only.
   */
  onExisting?: "reset" | "reject";
}): Promise<ProvisionPortalUserResult> {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const tempPassword = input.password?.trim() || generateTemporaryPassword();
  const mustChange = input.forcePasswordChange ?? !input.password;

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, email, role")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile) {
    if (input.onExisting === "reject") {
      return {
        error: `${email} already has an account (${existingProfile.role}). Use "Reset password" to re-send credentials.`,
      };
    }
    // Re-provisioning never changes who somebody is. A role change is a
    // deliberate access decision, not a side effect of resetting a password —
    // without this check, inviting an admin's email as "client" would demote
    // them AND rotate their password in one motion.
    if (existingProfile.role !== input.role) {
      return {
        error: `${email} already has the ${existingProfile.role} role. Roles are not changed by re-inviting.`,
      };
    }
  }

  let userId = existingProfile?.id;

  if (!userId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: mustChange },
    });

    if (createErr) {
      const msg = createErr.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = listed?.users?.find((u) => u.email?.toLowerCase() === email);
        if (!found) return { error: createErr.message };
        userId = found.id;
        await admin.auth.admin.updateUserById(userId, {
          password: tempPassword,
          user_metadata: { must_change_password: mustChange },
        });
      } else {
        return { error: createErr.message };
      }
    } else {
      userId = created.user?.id;
    }
  } else {
    await admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      user_metadata: { must_change_password: mustChange },
    });
  }

  if (!userId) return { error: "Could not create or find user." };

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      role: input.role,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      must_change_password: mustChange,
    },
    { onConflict: "id" }
  );

  if (profileErr) return { error: profileErr.message };

  let email_: CredentialsEmailOutcome = { status: "not-requested" };
  if (input.sendEmail !== false) {
    email_ = await sendPortalCredentialsEmail({
      to: email,
      firstName: input.firstName || "there",
      tempPassword,
      role: input.role,
    });
    if (email_.status === "failed") {
      // The account exists and the password works — only delivery failed.
      // Log it where it can be found, and hand the caller the truth so it
      // can tell an admin to pass the password along another way.
      console.error(`[portal] credentials email to ${email} failed: ${email_.reason}`);
    }
  }

  return {
    ok: true as const,
    userId,
    tempPassword,
    email: email_,
    loginUrl: `${SITE}${loginPathForRole(input.role)}`,
  };
}
