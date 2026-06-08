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

export async function sendPortalCredentialsEmail(payload: {
  to: string;
  firstName: string;
  tempPassword: string;
  role: UserRole;
}) {
  const client = resendClient();
  if (!client) return { skipped: true as const };

  const { subject, html, text } = portalCredentialsEmail({
    firstName: payload.firstName,
    email: payload.to,
    tempPassword: payload.tempPassword,
    role: payload.role,
    loginPath: loginPathForRole(payload.role),
  });

  await client.emails.send({
    from: FROM,
    to: payload.to,
    subject,
    html,
    text,
  });

  return { ok: true as const };
}

export async function provisionPortalUser(input: {
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  sendEmail?: boolean;
}) {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const tempPassword = generateTemporaryPassword();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  let userId = existingProfile?.id;

  if (!userId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
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
          user_metadata: { must_change_password: true },
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
      user_metadata: { must_change_password: true },
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
      must_change_password: true,
    },
    { onConflict: "id" }
  );

  if (profileErr) return { error: profileErr.message };

  if (input.sendEmail !== false) {
    await sendPortalCredentialsEmail({
      to: email,
      firstName: input.firstName || "there",
      tempPassword,
      role: input.role,
    });
  }

  return {
    ok: true as const,
    userId,
    tempPassword,
    loginUrl: `${SITE}${loginPathForRole(input.role)}`,
  };
}
