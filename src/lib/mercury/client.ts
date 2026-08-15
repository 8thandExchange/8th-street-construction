import { MERCURY_API_BASE } from "./config";
import { ProxyAgent, fetch as undiciFetch } from "undici";

/**
 * Two tokens, two paths.
 *
 * Mercury only enforces its IP allowlist on tokens that can move money —
 * Read-and-Write tokens and Custom tokens with write scopes. A Read Only token
 * has no IP restriction at all. So reads (accounts, transactions, invoice
 * status, statements, PDFs) use MERCURY_READ_TOKEN and go direct, and only the
 * writes (create invoice, create recipient, send ACH) carry MERCURY_API_TOKEN
 * through the Fixie static-IP proxy the allowlist is pinned to.
 *
 * Reads are the overwhelming majority of the traffic, so this takes the proxy
 * off the dashboard's critical path — it can no longer take billing down — and
 * keeps proxied request volume down to the handful of calls that actually
 * need a fixed egress IP.
 *
 * When MERCURY_READ_TOKEN is unset, reads fall back to the write token and the
 * proxy, which is the behavior that predates the split. Preview deployments
 * with no FIXIE_URL still serve reads as long as the read token is set.
 */

export type MercuryMode = "read" | "write";

export class MercuryApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string
  ) {
    super(message);
    this.name = "MercuryApiError";
  }
}

/** Structural: undici's Response and the global one both satisfy this. */
type MercuryResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

// RequestInit's own `mode` (cors/no-cors) is meaningless server-side, so the
// name is free for the one that matters here: which token and path to use.
export type MercuryInit = Omit<RequestInit, "mode"> & {
  json?: unknown;
  mode?: MercuryMode;
};

function readToken() {
  return process.env.MERCURY_READ_TOKEN?.trim() || null;
}

function writeToken() {
  return process.env.MERCURY_API_TOKEN?.trim() || null;
}

/** GET/HEAD is a read; anything else moves state and needs the write token. */
export function modeForMethod(method?: string): MercuryMode {
  const verb = (method ?? "GET").toUpperCase();
  return verb === "GET" || verb === "HEAD" ? "read" : "write";
}

function tokenFor(mode: MercuryMode) {
  if (mode === "write") return writeToken();
  return readToken() ?? writeToken();
}

/**
 * Only IP-restricted tokens need the proxy. A read on its own token goes
 * direct; a read that fell back to the write token still has to be proxied.
 */
function needsProxy(mode: MercuryMode) {
  return mode === "write" || !readToken();
}

// ProxyAgent pools connections, so it is meant to outlive a single request.
// Rebuilt only if FIXIE_URL itself changes.
let cachedProxy: { url: string; agent: ProxyAgent } | null = null;

function getFixieDispatcher() {
  const fixieUrl = process.env.FIXIE_URL?.trim();
  if (!fixieUrl) return undefined;
  if (cachedProxy?.url !== fixieUrl) {
    cachedProxy = { url: fixieUrl, agent: new ProxyAgent(fixieUrl) };
  }
  return cachedProxy.agent;
}

/**
 * Raw request. Use this when the response is not JSON (PDFs); everything else
 * should go through mercuryFetch.
 */
export async function mercuryRequest(
  path: string,
  init?: MercuryInit
): Promise<MercuryResponse> {
  const { mode: requestedMode, json, ...rest } = init ?? {};

  const mode = requestedMode ?? modeForMethod(rest.method);
  const token = tokenFor(mode);
  if (!token) throw new Error("Mercury is not configured");

  const headers = new Headers(rest.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${MERCURY_API_BASE}${path}`;
  const body = json !== undefined ? JSON.stringify(json) : rest.body;
  const dispatcher = needsProxy(mode) ? getFixieDispatcher() : undefined;

  return dispatcher
    ? ((await undiciFetch(url, {
        method: rest.method,
        headers,
        body: body as string | undefined,
        dispatcher,
      })) as MercuryResponse)
    : ((await fetch(url, {
        ...rest,
        headers,
        body,
      })) as MercuryResponse);
}

export async function mercuryFetch<T>(path: string, init?: MercuryInit): Promise<T> {
  const res = await mercuryRequest(path, init);

  const text = await res.text();
  if (!res.ok) {
    throw new MercuryApiError(
      `Mercury API ${path} failed (${res.status})`,
      res.status,
      text
    );
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}
