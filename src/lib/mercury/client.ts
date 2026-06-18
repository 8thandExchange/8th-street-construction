import { MERCURY_API_BASE } from "./config";

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

  const res = await fetch(`${MERCURY_API_BASE}${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
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
