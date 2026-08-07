import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FieldEncryptionError,
  decryptField,
  encryptField,
  fieldEncryptionConfigured,
  isEncrypted,
  lastFour,
  vendorFieldContext,
} from "../field-encryption";

// Fixed test key — 32 bytes of base64. Never used anywhere real.
const KEY = Buffer.alloc(32, 7).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 9).toString("base64");

const VENDOR = "1a921e1c-33f4-4190-af07-c52d73b3fdf8";
const ctx = (col: string, id = VENDOR) => vendorFieldContext(col, id);

beforeEach(() => {
  process.env.FIELD_ENCRYPTION_KEY = KEY;
});

afterEach(() => {
  delete process.env.FIELD_ENCRYPTION_KEY;
});

describe("round trip", () => {
  it("returns the original value", () => {
    const sealed = encryptField("9876543210", ctx("remit_account_number"));
    expect(decryptField(sealed, ctx("remit_account_number"))).toBe("9876543210");
  });

  it("produces different ciphertext each time for the same input", () => {
    const a = encryptField("123456789", ctx("tax_id"));
    const b = encryptField("123456789", ctx("tax_id"));
    expect(a).not.toBe(b); // fresh IV per value
    expect(decryptField(a, ctx("tax_id"))).toBe(decryptField(b, ctx("tax_id")));
  });

  it("never leaves the plaintext visible in the stored value", () => {
    const sealed = encryptField("9876543210", ctx("remit_account_number"));
    expect(sealed).not.toContain("9876543210");
    expect(sealed.startsWith("enc:v1:")).toBe(true);
    expect(isEncrypted(sealed)).toBe(true);
  });

  it("handles leading zeroes, which account numbers really have", () => {
    const sealed = encryptField("0035463902", ctx("remit_account_number"));
    expect(decryptField(sealed, ctx("remit_account_number"))).toBe("0035463902");
  });
});

describe("context binding", () => {
  it("refuses a value moved to another column", () => {
    const sealed = encryptField("123456789", ctx("tax_id"));
    expect(() => decryptField(sealed, ctx("remit_account_number"))).toThrow(FieldEncryptionError);
  });

  it("refuses a value moved to another vendor's row", () => {
    const sealed = encryptField("9876543210", ctx("remit_account_number"));
    const otherVendor = ctx("remit_account_number", "99999999-9999-4999-8999-999999999999");
    expect(() => decryptField(sealed, otherVendor)).toThrow(FieldEncryptionError);
  });

  it("requires a context when encrypting", () => {
    expect(() => encryptField("123456789", "")).toThrow(FieldEncryptionError);
  });
});

describe("key handling", () => {
  it("refuses to encrypt with no key rather than storing plaintext", () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    expect(() => encryptField("9876543210", ctx("remit_account_number"))).toThrow(
      FieldEncryptionError
    );
    expect(fieldEncryptionConfigured()).toBe(false);
  });

  it("rejects a key of the wrong length", () => {
    process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString("base64");
    expect(() => encryptField("9876543210", ctx("remit_account_number"))).toThrow(
      /32 bytes/
    );
  });

  it("cannot decrypt with a different key", () => {
    const sealed = encryptField("9876543210", ctx("remit_account_number"));
    process.env.FIELD_ENCRYPTION_KEY = OTHER_KEY;
    expect(() => decryptField(sealed, ctx("remit_account_number"))).toThrow(FieldEncryptionError);
  });
});

describe("tampering", () => {
  it("rejects a modified ciphertext instead of returning garbage", () => {
    const sealed = encryptField("9876543210", ctx("remit_account_number"));
    const parts = sealed.split(":");
    const body = Buffer.from(parts[4], "base64url");
    body[0] ^= 0xff;
    parts[4] = body.toString("base64url");
    expect(() => decryptField(parts.join(":"), ctx("remit_account_number"))).toThrow(
      FieldEncryptionError
    );
  });

  it("rejects a malformed value", () => {
    expect(() => decryptField("enc:v1:only:three", ctx("tax_id"))).toThrow(FieldEncryptionError);
  });
});

describe("legacy plaintext tolerance", () => {
  // Deliberate: lets the code deploy before or after the backfill runs.
  it("passes through an unprefixed value unchanged", () => {
    expect(decryptField("9876543210", ctx("remit_account_number"))).toBe("9876543210");
    expect(isEncrypted("9876543210")).toBe(false);
  });

  it("treats empty and null as nothing on file", () => {
    expect(decryptField(null, ctx("tax_id"))).toBeNull();
    expect(decryptField("", ctx("tax_id"))).toBeNull();
    expect(decryptField(undefined, ctx("tax_id"))).toBeNull();
  });
});

describe("lastFour", () => {
  it("takes the last four digits, ignoring formatting", () => {
    expect(lastFour("12-3456789")).toBe("6789");
    expect(lastFour("9876543210")).toBe("3210");
    expect(lastFour("0035463902")).toBe("3902");
  });

  it("returns null when there aren't four digits to show", () => {
    expect(lastFour("123")).toBeNull();
    expect(lastFour("")).toBeNull();
    expect(lastFour(null)).toBeNull();
  });
});
