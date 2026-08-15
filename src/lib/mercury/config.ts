export const MERCURY_API_BASE = "https://api.mercury.com/api/v1";
export const MERCURY_PAY_BASE = "https://app.mercury.com/pay";

export function mercuryConfigured() {
  return Boolean(
    process.env.MERCURY_API_TOKEN?.trim() &&
      process.env.MERCURY_DESTINATION_ACCOUNT_ID?.trim()
  );
}

/**
 * True when reads have their own Read Only token and therefore bypass the
 * Fixie proxy. See the header comment in client.ts.
 */
export function mercuryReadsAreDirect() {
  return Boolean(process.env.MERCURY_READ_TOKEN?.trim());
}

export function mercuryWebhookConfigured() {
  return Boolean(process.env.MERCURY_WEBHOOK_SECRET?.trim());
}
