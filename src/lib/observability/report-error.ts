/**
 * Structured error reporting for operational failures that someone should
 * actually see — payment outcomes we can't confirm, webhook processing
 * failures, audit writes that didn't land.
 *
 * Two sinks:
 *  - Structured JSON on stderr, so Vercel log drains and searches can key on
 *    `event` instead of grepping prose.
 *  - Optional webhook (ALERT_WEBHOOK_URL) — a Slack/Discord/incoming-webhook
 *    URL that gets a short text alert. Fire-and-forget with a hard timeout;
 *    alerting must never slow or fail the request being reported.
 *
 * This is deliberately dependency-free. If/when a Sentry account exists, add
 * @sentry/nextjs and forward from here — call sites stay unchanged.
 */

type Context = Record<string, unknown>;

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function reportError(event: string, err: unknown, context?: Context): void {
  const payload = {
    level: "error",
    event,
    message: serializeError(err),
    ...(context ?? {}),
    at: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));

  const webhook = process.env.ALERT_WEBHOOK_URL?.trim();
  if (!webhook) return;

  const text = `⚠️ ${event}: ${payload.message}${
    context ? ` — ${JSON.stringify(context)}` : ""
  }`;
  // Not awaited by callers; bounded so a dead webhook can't hold a lambda open.
  void fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, content: text }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    // The alert channel being down is not worth an error loop.
  });
}
