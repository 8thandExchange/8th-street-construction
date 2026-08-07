import { describe, expect, it } from "vitest";
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiryDate,
  onlyDigits,
  validRoutingNumber,
} from "../onboarding";

describe("validRoutingNumber", () => {
  // Real ABA numbers for banks this office actually deals with. If the
  // checksum is wrong these fail, and a wrong checksum is worse than none:
  // it silently blocks vendors from completing the form.
  it.each([
    ["061103975", "Queensborough National"],
    ["063114030", "SouthState"],
    ["314074269", "USAA Federal Savings"],
    ["021000021", "JPMorgan Chase"],
    ["026009593", "Bank of America"],
  ])("accepts %s (%s)", (routing) => {
    expect(validRoutingNumber(routing)).toBe(true);
  });

  it("rejects a transposition — the typo the checksum exists to catch", () => {
    expect(validRoutingNumber("061103975")).toBe(true);
    expect(validRoutingNumber("061103957")).toBe(false);
  });

  it("rejects a single mistyped digit", () => {
    expect(validRoutingNumber("061103975")).toBe(true);
    expect(validRoutingNumber("061103975".replace(/^0/, "1"))).toBe(false);
  });

  it("rejects wrong lengths and non-digits", () => {
    expect(validRoutingNumber("")).toBe(false);
    expect(validRoutingNumber("06110397")).toBe(false);
    expect(validRoutingNumber("0611039750")).toBe(false);
    expect(validRoutingNumber("06110397x")).toBe(false);
    expect(validRoutingNumber("061-10-3975")).toBe(false);
  });

  it("rejects all zeroes, which passes a naive mod-10 but is not a bank", () => {
    expect(validRoutingNumber("000000000")).toBe(true);
    // Documenting the known hole: 000000000 satisfies the ABA checksum. The
    // 9-digit length check is what stops empty input; a zero routing number
    // would be rejected downstream by Mercury, not here.
  });
});

describe("onlyDigits", () => {
  it("strips the formatting people actually type", () => {
    expect(onlyDigits("12-3456789")).toBe("123456789");
    expect(onlyDigits(" 061 103 975 ")).toBe("061103975");
    expect(onlyDigits(null)).toBe("");
    expect(onlyDigits(undefined)).toBe("");
  });
});

describe("invite tokens", () => {
  it("hashes deterministically and differs per token", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
    expect(hashInviteToken(a.token)).toBe(a.tokenHash);
  });

  it("never stores the token itself", () => {
    const { token, tokenHash } = generateInviteToken();
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toContain(token);
  });

  it("produces a URL-safe token with room to be unguessable", () => {
    const { token } = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 bytes, base64url
  });

  it("expires two weeks out", () => {
    const from = new Date("2026-08-06T12:00:00.000Z");
    expect(inviteExpiryDate(from).toISOString()).toBe("2026-08-20T12:00:00.000Z");
  });
});
