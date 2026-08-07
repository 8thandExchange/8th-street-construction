import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Application-level encryption for the handful of columns that are secrets
 * rather than data: vendor bank account numbers and tax IDs.
 *
 * Why not pgcrypto or pgsodium — the two things Postgres offers here:
 *
 * The threat this defends against is someone getting a copy of the database
 * they shouldn't have: a leaked backup, an RLS mistake, a support session in
 * the Supabase dashboard, a stray `select *` in a log. In every one of those
 * the attacker has the database and nothing else. Encrypting inside Postgres
 * with a key that also lives in Postgres does not survive any of them —
 * whoever has the dump has the key. Supabase has also deprecated pgsodium's
 * transparent column encryption, so building on it now means building on a
 * path with no future.
 *
 * Keeping the key in the environment (Vercel) and the ciphertext in the
 * database means the dump alone is inert. It does NOT defend against a
 * compromise of the running application, which holds both — nothing at this
 * layer can. That is the honest boundary of what this buys.
 *
 * AES-256-GCM, fresh 96-bit IV per value, with the field's identity bound in
 * as additional authenticated data so a row that decrypts is provably the
 * row it was written for.
 */

const SCHEME = "enc:v1";
const IV_BYTES = 12; // 96 bits, the GCM standard
const KEY_BYTES = 32; // AES-256

export class FieldEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FieldEncryptionError";
  }
}

function loadKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new FieldEncryptionError(
      "FIELD_ENCRYPTION_KEY is not set. Refusing to handle vendor banking details without it."
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new FieldEncryptionError(
      `FIELD_ENCRYPTION_KEY must be ${KEY_BYTES} bytes of base64 (got ${key.length}). Generate one with: openssl rand -base64 32`
    );
  }
  return key;
}

/** True when the app is configured to encrypt. Never gates a WRITE — see encryptField. */
export function fieldEncryptionConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${SCHEME}:`);
}

/**
 * `context` binds the ciphertext to the exact field it belongs to, e.g.
 * "vendors:remit_account_number:<vendor uuid>". Anyone with write access to
 * the table who moves a blob to another row or another column gets a
 * decryption failure instead of a silent, plausible-looking swap.
 *
 * Throws rather than falling back to plaintext when the key is missing. A
 * silent fallback is the worst possible failure here: everything would keep
 * working, look identical, and quietly store account numbers in the clear.
 */
export function encryptField(plaintext: string, context: string): string {
  if (!context) throw new FieldEncryptionError("Encryption context is required.");

  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    SCHEME,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

/**
 * Decrypt a stored value.
 *
 * Values written before this shipped have no scheme prefix and are returned
 * as-is. That tolerance is what makes the rollout safe in either order —
 * code can deploy before the backfill runs, or after — and it costs nothing,
 * because a plaintext row was already plaintext. Writes are never tolerant
 * (see encryptField), so this cannot mask a misconfiguration going forward.
 */
export function decryptField(stored: string | null | undefined, context: string): string | null {
  if (stored === null || stored === undefined || stored === "") return null;
  if (!isEncrypted(stored)) return stored;

  const parts = stored.split(":");
  if (parts.length !== 5) {
    throw new FieldEncryptionError("Encrypted value is malformed.");
  }

  const [, , ivPart, tagPart, dataPart] = parts;
  const key = loadKey();

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivPart, "base64url")
    );
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key, tampered ciphertext, or a value moved between rows/columns.
    // Deliberately opaque: the caller gets no signal about which.
    throw new FieldEncryptionError(
      "Could not decrypt this value. The encryption key may have changed, or the stored value was altered."
    );
  }
}

/** Context builder, so callers can't drift on the string format. */
export function vendorFieldContext(column: string, vendorId: string): string {
  return `vendors:${column}:${vendorId}`;
}

/** Last four digits, kept in a plain column so the UI never needs the key. */
export function lastFour(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}
