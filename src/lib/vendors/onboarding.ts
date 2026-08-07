import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Vendor self-onboarding: a single-use, expiring link that lets a vendor
 * type their own W-9 and ACH details into their record.
 *
 * The token is 32 random bytes (256 bits), so guessing one is not a threat
 * model worth defending against. What IS worth defending against is a
 * leaked database giving someone live links, so only the SHA-256 of the
 * token is stored and lookups hash the presented value.
 */

const TOKEN_BYTES = 32;
export const INVITE_TTL_DAYS = 14;

export function generateInviteToken() {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time compare of two hex digests. The lookup itself is an indexed
 * equality match in Postgres and so is not constant time, but the token has
 * far too much entropy for that to leak anything useful; this guards the
 * one comparison we do in application code.
 */
function digestsEqual(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export type InviteVendor = {
  id: string;
  name: string;
  legal_name: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  tax_classification: string | null;
  /** True when banking is already on file. The values themselves are never sent to the browser. */
  hasRemit: boolean;
  hasW9: boolean;
};

export type InviteResolution =
  | { state: "invalid" }
  | { state: "expired" }
  | { state: "completed"; vendorName: string }
  | { state: "ok"; inviteId: string; vendor: InviteVendor };

/**
 * Resolve a raw token into an access decision. Service-role read — this runs
 * for callers with no session at all.
 *
 * Note what is NOT returned: account number, routing number, and tax id. A
 * vendor re-opening their link must not be shown the digits already on file,
 * because possession of the link is a much weaker proof of identity than a
 * login. They can overwrite them; they can't read them back.
 */
export async function resolveInvite(token: string): Promise<InviteResolution> {
  if (!token || token.length < 16 || token.length > 128) return { state: "invalid" };

  const admin = createAdminClient();
  const tokenHash = hashInviteToken(token);

  const { data: invite } = await admin
    .from("vendor_invites")
    .select(
      "id, token_hash, vendor_id, expires_at, completed_at, revoked_at, vendor:vendors(id, name, legal_name, contact_email, phone, address, tax_classification, remit_account_number, w9_path)"
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invite || !digestsEqual(invite.token_hash, tokenHash)) return { state: "invalid" };

  const vendor = Array.isArray(invite.vendor) ? invite.vendor[0] : invite.vendor;
  if (!vendor) return { state: "invalid" };

  // A revoked link is dead but must not look different from a bad one, or
  // it confirms the token was once real.
  if (invite.revoked_at) return { state: "invalid" };
  if (invite.completed_at) return { state: "completed", vendorName: vendor.name };
  if (new Date(invite.expires_at).getTime() <= Date.now()) return { state: "expired" };

  return {
    state: "ok",
    inviteId: invite.id,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      legal_name: vendor.legal_name,
      contact_email: vendor.contact_email,
      phone: vendor.phone,
      address: vendor.address,
      tax_classification: vendor.tax_classification,
      hasRemit: Boolean(vendor.remit_account_number),
      hasW9: Boolean(vendor.w9_path),
    },
  };
}

/**
 * Burn the invite. Filtered on completed_at is null so two submits racing
 * each other can't both win — the second gets zero rows and is rejected by
 * the caller rather than silently overwriting the first vendor's answers.
 */
export async function markInviteCompleted(inviteId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vendor_invites")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", inviteId)
    .is("completed_at", null)
    .is("revoked_at", null)
    .select("id");
  return Boolean(data?.length);
}

/** Supersede any live invite for a vendor. Called before issuing a new one. */
export async function revokeOpenInvites(vendorId: string) {
  const admin = createAdminClient();
  await admin
    .from("vendor_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("vendor_id", vendorId)
    .is("completed_at", null)
    .is("revoked_at", null);
}

export const onlyDigits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

/**
 * ABA routing checksum. Catches the overwhelming majority of transposed or
 * mistyped routing numbers at the point of entry, which is the only place
 * they're cheap to catch — after that it's a returned ACH, a support call,
 * and a vendor who still hasn't been paid.
 */
export function validRoutingNumber(value: string) {
  if (!/^\d{9}$/.test(value)) return false;
  const d = value.split("").map(Number);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + 1 * (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

export function inviteExpiryDate(from = new Date()) {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function vendorFormUrl(token: string) {
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com"
  ).replace(/\/$/, "");
  return `${site}/vendor-form/${token}`;
}
