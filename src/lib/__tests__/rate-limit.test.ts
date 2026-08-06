import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
}));

import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  enforceRateLimit,
  tooManyRequests,
} from "../rate-limit";

beforeEach(() => {
  rpc.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("clientIp", () => {
  it("takes the leftmost x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 10.0.0.1" });
    expect(clientIp(h)).toBe("203.0.113.7");
  });

  it("trims whitespace around the entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "  203.0.113.7  " }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("buckets callers with no usable header under a shared key", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("ignores an empty x-forwarded-for rather than returning an empty key", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "", "x-real-ip": "198.51.100.4" }))).toBe(
      "198.51.100.4"
    );
  });
});

describe("checkRateLimit", () => {
  it("passes the namespaced key and the scope's configured limits", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: true, retry_after: 0 }], error: null });

    await checkRateLimit("leads", "203.0.113.7");

    expect(rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "leads:203.0.113.7",
      p_limit: RATE_LIMITS.leads.limit,
      p_window_seconds: RATE_LIMITS.leads.windowSeconds,
    });
  });

  it("keys scopes separately so one route can't consume another's budget", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: true, retry_after: 0 }], error: null });

    await checkRateLimit("leads", "203.0.113.7");
    await checkRateLimit("bookings", "203.0.113.7");

    expect(rpc.mock.calls[0][1].p_key).toBe("leads:203.0.113.7");
    expect(rpc.mock.calls[1][1].p_key).toBe("bookings:203.0.113.7");
  });

  it("reports a denial with the retry_after the function returned", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: false, retry_after: 412 }], error: null });

    expect(await checkRateLimit("leads", "203.0.113.7")).toEqual({
      allowed: false,
      retryAfter: 412,
    });
  });

  it("accepts a bare row as well as the array supabase-js normally returns", async () => {
    rpc.mockResolvedValue({ data: { allowed: false, retry_after: 30 }, error: null });

    expect(await checkRateLimit("leads", "203.0.113.7")).toEqual({
      allowed: false,
      retryAfter: 30,
    });
  });

  // Fail-open is deliberate: a limiter outage must not take the public contact
  // form offline. These pin that down so it can't regress into fail-closed.
  it("allows the request when the RPC returns an error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "function does not exist" } });

    expect(await checkRateLimit("leads", "203.0.113.7")).toEqual({ allowed: true, retryAfter: 0 });
  });

  it("allows the request when the client throws", async () => {
    rpc.mockRejectedValue(new Error("connection refused"));

    expect(await checkRateLimit("leads", "203.0.113.7")).toEqual({ allowed: true, retryAfter: 0 });
  });

  it("allows the request when the response shape is unrecognized", async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    expect(await checkRateLimit("leads", "203.0.113.7")).toEqual({ allowed: true, retryAfter: 0 });
  });
});

describe("tooManyRequests", () => {
  it("returns a 429 carrying Retry-After", async () => {
    const res = tooManyRequests(120);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    await expect(res.json()).resolves.toMatchObject({ retry_after: 120 });
  });

  it("uses the caller's message when one is given", async () => {
    const res = tooManyRequests(60, "Please wait a few minutes and try again.");

    await expect(res.json()).resolves.toMatchObject({
      error: "Please wait a few minutes and try again.",
    });
  });
});

describe("enforceRateLimit", () => {
  it("returns null so the route proceeds when under the limit", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: true, retry_after: 0 }], error: null });

    expect(await enforceRateLimit("leads", "203.0.113.7")).toBeNull();
  });

  it("returns a ready-to-send 429 when over the limit", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: false, retry_after: 90 }], error: null });

    const res = await enforceRateLimit("leads", "203.0.113.7", "Slow down.");

    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("90");
    await expect(res?.json()).resolves.toMatchObject({ error: "Slow down." });
  });
});

describe("configured limits", () => {
  it("keeps every scope to a positive limit and window", () => {
    for (const [scope, cfg] of Object.entries(RATE_LIMITS)) {
      expect(cfg.limit, `${scope} limit`).toBeGreaterThan(0);
      expect(cfg.windowSeconds, `${scope} window`).toBeGreaterThan(0);
    }
  });
});
