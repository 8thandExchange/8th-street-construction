import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "8sc_invoicing_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  return (
    process.env.INVOICING_SESSION_SECRET ??
    process.env.STRIPE_SECRET_KEY ??
    "development-invoicing-secret"
  );
}

function signToken(payload: string): string {
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

function verifyToken(token: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");

  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.INVOICING_ADMIN_PASSWORD;
  if (!expected) return false;
  if (password.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

export async function createInvoicingSession(): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url");
  const token = signToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroyInvoicingSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isInvoicingAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !verifyToken(token)) return false;

  const [payload] = token.split(".");
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export async function requireInvoicingAuth(): Promise<void> {
  const authed = await isInvoicingAuthenticated();
  if (!authed) {
    throw new Error("Unauthorized");
  }
}
