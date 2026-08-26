import { bytesMatchClaimedType } from "@/lib/uploads/sniff";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";
import {
  encryptField,
  lastFour,
  vendorFieldContext,
} from "@/lib/crypto/field-encryption";
import {
  markInviteCompleted,
  onlyDigits as digits,
  resolveInvite,
  validRoutingNumber,
} from "@/lib/vendors/onboarding";

export const dynamic = "force-dynamic";

const MAX_W9_BYTES = 10 * 1024 * 1024;
const ALLOWED_W9_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

const ACCOUNT_TYPES = [
  "businessChecking",
  "businessSavings",
  "personalChecking",
  "personalSavings",
] as const;

const TAX_CLASSIFICATIONS = [
  "Sole proprietor",
  "Partnership",
  "C corporation",
  "S corporation",
  "LLC",
  "Trust/estate",
  "Other",
] as const;

const SubmissionSchema = z.object({
  legal_name: z.string().trim().min(2, "Enter the legal business name").max(200),
  contact_email: z.string().trim().email("Enter a valid email address").max(200),
  phone: z.string().trim().max(40),
  address: z.string().trim().min(8, "Enter the full mailing address").max(400),
  tax_classification: z.enum(TAX_CLASSIFICATIONS, {
    errorMap: () => ({ message: "Choose a business type" }),
  }),
  tax_id: z
    .string()
    .transform(digits)
    .refine((v) => v.length === 9, "A tax ID (EIN or SSN) is 9 digits"),
  remit_account_name: z.string().trim().min(2, "Enter the name on the account").max(200),
  remit_account_type: z.enum(ACCOUNT_TYPES, {
    errorMap: () => ({ message: "Choose an account type" }),
  }),
  remit_routing_number: z
    .string()
    .transform(digits)
    .refine(validRoutingNumber, "That routing number doesn't look right — please double-check it"),
  remit_account_number: z
    .string()
    .transform(digits)
    .refine((v) => v.length >= 4 && v.length <= 17, "Enter the account number"),
});

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Public, unauthenticated vendor onboarding submit. Possession of the token
 * is the whole authorisation, so everything is validated here rather than
 * trusted from the client, and the invite is burned on success.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  const limited = await enforceRateLimit(
    "vendorOnboarding",
    clientIp(request.headers),
    "Too many attempts. Please wait a few minutes and try again."
  );
  if (limited) return limited;

  const invite = await resolveInvite(token);
  if (invite.state === "invalid") return fail("This link is no longer valid.", 404);
  if (invite.state === "expired") {
    return fail("This link has expired. Ask your contact at 8th Street for a new one.", 410);
  }
  if (invite.state === "completed") {
    return fail("This form has already been submitted. Thank you!", 409);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("We couldn't read that submission. Please try again.");
  }

  // FormData.get returns null for a field the request simply didn't include,
  // and a bare null fails every string schema with zod's own "Invalid input"
  // — no use to the person filling the form in. Normalising to "" lets each
  // field answer with its own message instead.
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };

  const parsed = SubmissionSchema.safeParse({
    legal_name: field("legal_name"),
    contact_email: field("contact_email"),
    phone: field("phone"),
    address: field("address"),
    tax_classification: field("tax_classification"),
    tax_id: field("tax_id"),
    remit_account_name: field("remit_account_name"),
    remit_account_type: field("remit_account_type"),
    remit_routing_number: field("remit_routing_number"),
    remit_account_number: field("remit_account_number"),
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  }
  const values = parsed.data;

  // The browser checks this too, but a mismatch here means the two boxes
  // disagreed and we must not guess which one is the real account.
  const confirm = digits(form.get("remit_account_number_confirm"));
  if (confirm && confirm !== values.remit_account_number) {
    return fail("The two account numbers don't match. Please re-enter them.");
  }

  const admin = createAdminClient();

  // Optional W-9. Stored before the vendor update so a storage failure can't
  // leave a record claiming a document that isn't there.
  let w9Path: string | null = null;
  const w9 = form.get("w9");
  if (w9 instanceof File && w9.size > 0) {
    if (!ALLOWED_W9_TYPES.includes(w9.type)) {
      return fail("The W-9 must be a PDF or an image (PNG, JPG, WEBP).");
    }
    if (w9.size > MAX_W9_BYTES) {
      return fail("That file is too large — please keep the W-9 under 10 MB.");
    }
    const w9Bytes = new Uint8Array(await w9.arrayBuffer());
    if (!bytesMatchClaimedType(w9Bytes, w9.type)) {
      return fail("That file doesn't look like a valid PDF or image. Re-export it and try again.");
    }
    const ext = w9.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
    const path = `vendors/w9/${invite.vendor.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, w9Bytes, { contentType: w9.type, upsert: false });
    if (uploadError) {
      console.error("Vendor W-9 upload failed:", uploadError.message);
      return fail("We couldn't save that file. Try again, or submit without it.", 500);
    }
    w9Path = path;
  }

  // Encrypt before burning the invite: if the key is missing this throws,
  // and the vendor must be left able to retry rather than holding a dead
  // link and an unsaved form.
  let encryptedTaxId: string;
  let encryptedAccount: string;
  try {
    encryptedTaxId = encryptField(
      values.tax_id,
      vendorFieldContext("tax_id", invite.vendor.id)
    );
    encryptedAccount = encryptField(
      values.remit_account_number,
      vendorFieldContext("remit_account_number", invite.vendor.id)
    );
  } catch (err) {
    console.error("Vendor onboarding: encryption unavailable —", err);
    return fail("We couldn't save your details securely. Please try again shortly.", 500);
  }

  // Burn the invite BEFORE writing. If two submissions race, only one gets
  // through, and the loser has changed nothing.
  const claimed = await markInviteCompleted(invite.inviteId);
  if (!claimed) return fail("This form has already been submitted. Thank you!", 409);

  const { error: updateError } = await admin
    .from("vendors")
    .update({
      legal_name: values.legal_name,
      contact_email: values.contact_email,
      phone: values.phone?.trim() || null,
      address: values.address,
      tax_classification: values.tax_classification,
      tax_id: encryptedTaxId,
      tax_id_last4: lastFour(values.tax_id),
      remit_account_name: values.remit_account_name,
      remit_account_type: values.remit_account_type,
      remit_routing_number: values.remit_routing_number,
      remit_account_number: encryptedAccount,
      remit_account_last4: lastFour(values.remit_account_number),
      // New banking details invalidate any Mercury recipient built from the
      // old ones — same rule as updateVendorRemit().
      mercury_recipient_id: null,
      onboarded_at: new Date().toISOString(),
      ...(w9Path ? { w9_path: w9Path } : {}),
    })
    .eq("id", invite.vendor.id);

  if (updateError) {
    console.error("Vendor onboarding update failed:", updateError.message);
    return fail("We couldn't save your details. Please try again.", 500);
  }

  await notifyAdmin(invite.vendor.id, invite.vendor.name, values.legal_name, Boolean(w9Path));

  return NextResponse.json({ ok: true });
}

/** Best-effort heads-up to the office. Never fails the vendor's submission. */
async function notifyAdmin(
  vendorId: string,
  vendorName: string,
  legalName: string,
  hasW9: boolean
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const site = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com"
  ).replace(/\/$/, "");

  try {
    await new Resend(key).emails.send({
      from: process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>",
      to: process.env.EMAIL_TO_LEADS || "construction@8thandexchange.com",
      subject: `Vendor setup complete — ${vendorName}`,
      text: [
        `${vendorName} finished their vendor form.`,
        `Legal name: ${legalName}`,
        `W-9 attached: ${hasW9 ? "yes" : "no"}`,
        "",
        "Banking details are on file and they're ready to pay by ACH:",
        `${site}/admin/vendors/${vendorId}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("Vendor onboarding notification failed:", err);
  }
}
