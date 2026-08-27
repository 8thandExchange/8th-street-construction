"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { vendorOnboardingEmail } from "@/lib/email/templates/vendor-onboarding";
import {
  generateInviteToken,
  inviteExpiryDate,
  revokeOpenInvites,
  vendorFormUrl,
} from "@/lib/vendors/onboarding";

const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";

function formatExpiry(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/**
 * Create (or reuse) a vendor and issue a fresh onboarding link for them.
 *
 * The link is always returned to the caller even when the email fails or
 * Resend isn't configured — the admin can paste it into their own mail
 * client, which is the fallback that matters given outbound mail from the
 * company domain isn't monitored.
 */
export async function sendVendorInvite(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("contact_email") ?? "").trim().toLowerCase();
  const existingVendorId = String(formData.get("vendor_id") ?? "").trim();
  const shouldEmail = String(formData.get("send_email") ?? "true") !== "false";

  if (!existingVendorId && !name) return { error: "Vendor name is required" };
  if (!email || !email.includes("@")) return { error: "A valid email address is required" };

  let vendorId = existingVendorId;
  let vendorName = name;

  if (vendorId) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("id", vendorId)
      .maybeSingle();
    if (!vendor) return { error: "Vendor not found" };
    vendorName = vendor.name;
    await supabase.from("vendors").update({ contact_email: email }).eq("id", vendorId);
  } else {
    // lower(name) is uniquely indexed, so "add" on an existing name is an
    // update rather than a duplicate row.
    const { data: existing } = await supabase
      .from("vendors")
      .select("id, name")
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      vendorId = existing.id;
      vendorName = existing.name;
      await supabase.from("vendors").update({ contact_email: email }).eq("id", vendorId);
    } else {
      const { data: created, error } = await supabase
        .from("vendors")
        .insert({
          name,
          contact_email: email,
          phone: String(formData.get("phone") ?? "").trim() || null,
        })
        .select("id, name")
        .single();
      if (error || !created) return { error: error?.message ?? "Could not create the vendor" };
      vendorId = created.id;
      vendorName = created.name;
    }
  }

  // One live link per vendor. Re-sending kills the previous one so a
  // forwarded or stale link can't be used after a re-issue.
  await revokeOpenInvites(vendorId);

  const { token, tokenHash } = generateInviteToken();
  const expiresAt = inviteExpiryDate();

  const { error: inviteError } = await supabase.from("vendor_invites").insert({
    vendor_id: vendorId,
    token_hash: tokenHash,
    email,
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
  });
  if (inviteError) return { error: inviteError.message };

  const url = vendorFormUrl(token);
  let emailed = false;
  let emailError: string | null = null;

  if (shouldEmail) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      emailError = "Email isn't configured — copy the link and send it yourself.";
    } else {
      try {
        const { subject, html, text } = vendorOnboardingEmail({
          vendorName,
          formUrl: url,
          expiresFormatted: formatExpiry(expiresAt),
        });
        await new Resend(key).emails.send({ from: FROM, to: email, subject, html, text });
        emailed = true;
      } catch (err) {
        // Never fail the whole action on a send error — the link is valid
        // and the admin can still deliver it by hand.
        emailError = err instanceof Error ? err.message : "Could not send the email.";
        console.error("Vendor invite email failed:", err);
      }
    }
  }

  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);

  return { ok: true as const, vendor_id: vendorId, url, emailed, emailError };
}

/** Kill a vendor's outstanding link without issuing a new one. */
export async function revokeVendorInvite(formData: FormData) {
  await requireAdmin();
  const vendorId = String(formData.get("vendor_id") ?? "").trim();
  if (!vendorId) return { error: "Vendor is required" };

  await revokeOpenInvites(vendorId);
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);
  return { ok: true as const };
}
