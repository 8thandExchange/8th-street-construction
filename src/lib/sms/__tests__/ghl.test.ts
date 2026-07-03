import { afterEach, describe, expect, it } from "vitest";

import { ghlConfigured, normalizePhone, sendSms } from "../ghl";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("normalizePhone", () => {
  it("normalizes common US formats to E.164", () => {
    expect(normalizePhone("(706) 555-0123")).toBe("+17065550123");
    expect(normalizePhone("706-555-0123")).toBe("+17065550123");
    expect(normalizePhone("17065550123")).toBe("+17065550123");
    expect(normalizePhone("+1 706 555 0123")).toBe("+17065550123");
  });

  it("rejects junk", () => {
    expect(normalizePhone("555-0123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("not a phone")).toBeNull();
  });
});

describe("sendSms gating", () => {
  it("no-ops without configuration instead of throwing", async () => {
    delete process.env.GHL_API_TOKEN;
    delete process.env.GHL_LOCATION_ID;
    expect(ghlConfigured()).toBe(false);
    const result = await sendSms({ phone: "+17065550123", message: "hi" });
    expect(result).toEqual({ sent: false, reason: "not_configured" });
  });

  it("no-ops when the recipient has no phone", async () => {
    process.env.GHL_API_TOKEN = "pit-test";
    process.env.GHL_LOCATION_ID = "loc-test";
    const result = await sendSms({ phone: null, message: "hi" });
    expect(result).toEqual({ sent: false, reason: "no_phone" });
  });

  it("no-ops on an unparseable phone", async () => {
    process.env.GHL_API_TOKEN = "pit-test";
    process.env.GHL_LOCATION_ID = "loc-test";
    const result = await sendSms({ phone: "12", message: "hi" });
    expect(result).toEqual({ sent: false, reason: "invalid_phone" });
  });
});
