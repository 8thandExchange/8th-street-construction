import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The read/write token split. Getting this wrong is expensive in both
 * directions: a write that skips the proxy is rejected by Mercury's IP
 * allowlist, and a read that takes the proxy burns Fixie request quota for no
 * reason and puts a third party on the dashboard's critical path.
 */

type Call = { url: string; headers: Headers; proxied: boolean };

// Hoisted so the vi.mock factory below can close over it.
const { calls } = vi.hoisted(() => ({ calls: [] as Call[] }));

function fakeResponse() {
  return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
}

vi.mock("undici", () => ({
  ProxyAgent: class {
    constructor(public url: string) {}
  },
  fetch: async (url: string, init: { headers: Headers; dispatcher?: unknown }) => {
    calls.push({ url, headers: init.headers, proxied: true });
    return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
  },
}));

import { mercuryFetch, modeForMethod } from "../client";

const READ = "secret-token:read";
const WRITE = "secret-token:write";
const FIXIE = "http://fixie:pw@velodrome.usefixie.com:80";

function authOf(call: Call) {
  return call.headers.get("authorization");
}

beforeEach(() => {
  calls.length = 0;
  process.env.MERCURY_API_TOKEN = WRITE;
  process.env.MERCURY_READ_TOKEN = READ;
  process.env.FIXIE_URL = FIXIE;

  vi.stubGlobal("fetch", async (url: string, init: { headers: Headers }) => {
    calls.push({ url, headers: init.headers, proxied: false });
    return fakeResponse();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.MERCURY_API_TOKEN;
  delete process.env.MERCURY_READ_TOKEN;
  delete process.env.FIXIE_URL;
});

describe("modeForMethod", () => {
  it("treats GET and HEAD as reads and everything else as writes", () => {
    expect(modeForMethod()).toBe("read");
    expect(modeForMethod("get")).toBe("read");
    expect(modeForMethod("HEAD")).toBe("read");
    expect(modeForMethod("POST")).toBe("write");
    expect(modeForMethod("DELETE")).toBe("write");
  });
});

describe("mercuryFetch routing", () => {
  it("sends a GET direct on the read token", async () => {
    await mercuryFetch("/ar/invoices/abc");

    expect(calls).toHaveLength(1);
    expect(calls[0].proxied).toBe(false);
    expect(authOf(calls[0])).toBe(`Bearer ${READ}`);
    expect(calls[0].url).toBe("https://api.mercury.com/api/v1/ar/invoices/abc");
  });

  it("sends a POST through the proxy on the write token", async () => {
    await mercuryFetch("/recipients", { method: "POST", json: { name: "Vendor" } });

    expect(calls).toHaveLength(1);
    expect(calls[0].proxied).toBe(true);
    expect(authOf(calls[0])).toBe(`Bearer ${WRITE}`);
    expect(calls[0].headers.get("content-type")).toBe("application/json");
  });

  it("keeps a GET on the proxy and the write token when no read token is set", async () => {
    delete process.env.MERCURY_READ_TOKEN;

    await mercuryFetch("/accounts");

    expect(calls[0].proxied).toBe(true);
    expect(authOf(calls[0])).toBe(`Bearer ${WRITE}`);
  });

  it("honors an explicit write mode on a GET", async () => {
    await mercuryFetch("/accounts", { mode: "write" });

    expect(calls[0].proxied).toBe(true);
    expect(authOf(calls[0])).toBe(`Bearer ${WRITE}`);
  });

  it("serves reads with FIXIE_URL unset, which is the preview case", async () => {
    delete process.env.FIXIE_URL;

    await mercuryFetch("/accounts");

    expect(calls[0].proxied).toBe(false);
    expect(authOf(calls[0])).toBe(`Bearer ${READ}`);
  });

  it("refuses a write when only the read token is configured", async () => {
    delete process.env.MERCURY_API_TOKEN;

    await expect(mercuryFetch("/recipients", { method: "POST" })).rejects.toThrow(
      "Mercury is not configured"
    );
    expect(calls).toHaveLength(0);
  });
});
