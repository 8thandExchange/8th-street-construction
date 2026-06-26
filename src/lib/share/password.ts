import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";

const SCRYPT_KEYLEN = 64;

/** Hash a share password as `scrypt$<saltHex>$<keyHex>`. */
export function hashSharePassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifySharePassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  let actual: Buffer;
  try {
    actual = scryptSync(password, salt, expected.length);
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** URL-safe, unguessable token for the public share path. */
export function generateShareToken(): string {
  return randomBytes(18).toString("base64url");
}

function signingKey(): string {
  return (
    process.env.SHARE_LINK_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "8th-street-share-fallback"
  );
}

/**
 * Cookie value proving a visitor cleared the password gate for a given token.
 * Bound to the current password hash so rotating the password invalidates
 * all existing sessions automatically.
 */
export function shareSessionValue(token: string, passwordHash: string): string {
  return createHmac("sha256", signingKey())
    .update(`${token}:${passwordHash}`)
    .digest("hex");
}

export function shareCookieName(token: string): string {
  // Keep cookie scoped per-token so one job's access never unlocks another.
  return `sps_${token.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}`;
}
