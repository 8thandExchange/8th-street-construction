import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shareSessionValue } from "../password";

describe("share session signing", () => {
  const originalShareSecret = process.env.SHARE_LINK_SECRET;
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    delete process.env.SHARE_LINK_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    if (originalShareSecret === undefined) delete process.env.SHARE_LINK_SECRET;
    else process.env.SHARE_LINK_SECRET = originalShareSecret;
    if (originalServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
  });

  it("fails closed when no server secret is configured", () => {
    expect(() => shareSessionValue("share-token", "password-hash")).toThrow(
      /signing is not configured/i
    );
  });

  it("uses the dedicated share secret when configured", () => {
    process.env.SHARE_LINK_SECRET = "dedicated-share-secret";
    const first = shareSessionValue("share-token", "password-hash");
    const second = shareSessionValue("share-token", "password-hash");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("falls back only to the server-side service-role secret", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-service-role";
    expect(shareSessionValue("share-token", "password-hash")).toMatch(/^[a-f0-9]{64}$/);
  });
});
