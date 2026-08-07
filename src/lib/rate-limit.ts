import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Per-IP / per-user rate limiting, backed by the rate_limits table.
 *
 * Deliberately NOT an in-memory Map: on Vercel serverless each invocation can
 * be a fresh process, so a process-local counter gives close to zero
 * protection. The counter lives in Postgres and the check-and-increment is
 * atomic (see check_rate_limit in the 20260806120000_rate_limits migration).
 */

/** Tuned per route. Keep these generous enough that a real person never trips one. */
export const RATE_LIMITS = {
  /** Public contact form: inserts a lead AND sends two emails. */
  leads: { limit: 5, windowSeconds: 600 },
  /** Public consultation booking: same cost profile as leads. */
  bookings: { limit: 5, windowSeconds: 600 },
  /** Admin AI chat — billed Anthropic tokens. Far above human typing speed. */
  assistant: { limit: 40, windowSeconds: 600 },
  /** Admin chat attachments — each upload is later read by the model. */
  assistantUpload: { limit: 20, windowSeconds: 600 },
  /** Client portal AI chat — billed tokens, one cap per client account. */
  clientAssistant: { limit: 30, windowSeconds: 600 },
  /**
   * Public vendor onboarding form. Unauthenticated, writes banking details,
   * and accepts a file upload — the most consequential open endpoint in the
   * app. A real vendor submits once, maybe twice after a typo.
   */
  vendorOnboarding: { limit: 8, windowSeconds: 600 },
} as const;

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the window rolls over. 0 when allowed. */
  retryAfter: number;
};

/**
 * Best-effort client IP. On Vercel x-forwarded-for is set by the platform and
 * its leftmost entry is the real client, so it can't be spoofed by adding your
 * own header. Falls back to a shared "unknown" bucket, which is intentionally
 * conservative: if we can't tell callers apart they share one budget.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Check and consume one unit of the caller's budget for `scope`.
 *
 * Fails OPEN. If Postgres is unreachable or the function is missing, we log and
 * allow the request: a broken limiter must not take the public contact form
 * offline. The failure mode we're defending against is abuse, not correctness,
 * and silently 500ing every lead would be a worse outcome than a missed cap.
 */
export async function checkRateLimit(
  scope: keyof typeof RATE_LIMITS,
  identifier: string
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = RATE_LIMITS[scope];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: `${scope}:${identifier}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error("[rate-limit] check failed, allowing request:", error);
      return { allowed: true, retryAfter: 0 };
    }

    // The function returns a single row; supabase-js surfaces it as an array.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row.allowed !== "boolean") {
      console.error("[rate-limit] unexpected response, allowing request:", data);
      return { allowed: true, retryAfter: 0 };
    }

    return { allowed: row.allowed, retryAfter: Number(row.retry_after) || 0 };
  } catch (err) {
    console.error("[rate-limit] check threw, allowing request:", err);
    return { allowed: true, retryAfter: 0 };
  }
}

/** Standard 429 with a Retry-After header. */
export function tooManyRequests(retryAfter: number, message?: string) {
  return NextResponse.json(
    {
      error:
        message ??
        "Too many requests. Please wait a moment and try again.",
      retry_after: retryAfter,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * Convenience wrapper: returns a ready-to-send 429 when the caller is over
 * their limit, or null when the request should proceed.
 */
export async function enforceRateLimit(
  scope: keyof typeof RATE_LIMITS,
  identifier: string,
  message?: string
): Promise<NextResponse | null> {
  const { allowed, retryAfter } = await checkRateLimit(scope, identifier);
  return allowed ? null : tooManyRequests(retryAfter, message);
}
