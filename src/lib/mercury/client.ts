import { MERCURY_API_BASE } from "./config";
import { ProxyAgent, fetch as undiciFetch } from "undici";

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

function getToken() {
  const token = process.env.MERCURY_API_TOKEN?.trim();
  if (!token) return null;
  return token;
}

function getFixieDispatcher() {
  const fixieUrl = process.env.FIXIE_URL?.trim();
  if (!fixieUrl) return undefined;
  return new ProxyAgent(fixieUrl);
}

export async function mercuryFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Mercury is not configured");

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${MERCURY_API_BASE}${path}`;
  const body = init?.json !== undefined ? JSON.stringify(init.json) : init?.body;
  const dispatcher = getFixieDispatcher();

  const res = dispatcher
    ? await undiciFetch(url, {
        method: init?.method,
        headers,
        body: body as string | undefined,
        dispatcher,
      })
    : await fetch(url, {
        ...init,
        headers,
        body,
      });

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
