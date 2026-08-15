import { NextResponse } from "next/server";
import {
  mercuryConfigured,
  mercuryReadsAreDirect,
  mercuryWebhookConfigured,
} from "@/lib/mercury/config";
import { mercuryFetch } from "@/lib/mercury/client";

export const dynamic = "force-dynamic";

type Accounts = { accounts?: { id: string; name?: string; type?: string }[] };

type HealthResult = {
  ok: boolean;
  read_path: "direct" | "proxied";
  checks: {
    mercury_token: boolean;
    mercury_read_token: boolean;
    mercury_destination_account: boolean;
    mercury_webhook_secret: boolean;
    fixie_proxy: boolean;
    mercury_api_reachable: boolean | null;
    mercury_api_error?: string;
    // Only exercised when reads are split off: confirms the write token still
    // reaches Mercury through Fixie, which nothing else checks until a payment
    // or an invoice push fails.
    mercury_write_path_reachable?: boolean | null;
    mercury_write_path_error?: string;
    sample_account_id?: string;
  };
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenSet = Boolean(process.env.MERCURY_API_TOKEN?.trim());
  const readTokenSet = mercuryReadsAreDirect();
  const destSet = Boolean(process.env.MERCURY_DESTINATION_ACCOUNT_ID?.trim());
  const fixieSet = Boolean(process.env.FIXIE_URL?.trim());

  const result: HealthResult = {
    ok: false,
    read_path: readTokenSet ? "direct" : "proxied",
    checks: {
      mercury_token: tokenSet,
      mercury_read_token: readTokenSet,
      mercury_destination_account: destSet,
      mercury_webhook_secret: mercuryWebhookConfigured(),
      fixie_proxy: fixieSet,
      mercury_api_reachable: null,
    },
  };

  if (!mercuryConfigured()) {
    return NextResponse.json({
      ...result,
      message: "Set MERCURY_API_TOKEN and MERCURY_DESTINATION_ACCOUNT_ID in Vercel.",
    });
  }

  try {
    const data = await mercuryFetch<Accounts>("/accounts");
    const accounts = data.accounts ?? [];
    result.checks.mercury_api_reachable = true;
    result.checks.sample_account_id = accounts[0]?.id;
  } catch (err) {
    result.checks.mercury_api_reachable = false;
    result.checks.mercury_api_error =
      err instanceof Error ? err.message : "Mercury API request failed";
  }

  if (readTokenSet) {
    // Same harmless GET, forced down the write path — token, proxy, allowlist.
    try {
      await mercuryFetch<Accounts>("/accounts", { mode: "write" });
      result.checks.mercury_write_path_reachable = true;
    } catch (err) {
      result.checks.mercury_write_path_reachable = false;
      result.checks.mercury_write_path_error =
        err instanceof Error ? err.message : "Mercury write path request failed";
    }
  }

  result.ok =
    result.checks.mercury_token &&
    result.checks.mercury_destination_account &&
    result.checks.mercury_api_reachable === true &&
    result.checks.mercury_write_path_reachable !== false;

  return NextResponse.json(result);
}
