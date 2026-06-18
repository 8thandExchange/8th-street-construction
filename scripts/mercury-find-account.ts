#!/usr/bin/env npx tsx
/**
 * Lists Mercury depository accounts so you can copy MERCURY_DESTINATION_ACCOUNT_ID.
 *
 * Usage:
 *   MERCURY_API_TOKEN="secret-token:mercury_production_..." npx tsx scripts/mercury-find-account.ts
 */

const token = process.env.MERCURY_API_TOKEN?.trim();
if (!token) {
  console.error("Set MERCURY_API_TOKEN first.");
  process.exit(1);
}

type Account = {
  id: string;
  name?: string;
  type?: string;
  status?: string;
  availableBalance?: number;
  currentBalance?: number;
};

async function main() {
  const fixie = process.env.FIXIE_URL?.trim();
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  let res: Response;
  if (fixie) {
    const { ProxyAgent, fetch: undiciFetch } = await import("undici");
    res = (await undiciFetch("https://api.mercury.com/api/v1/accounts", {
      headers,
      dispatcher: new ProxyAgent(fixie),
    })) as Response;
  } else {
    res = await fetch("https://api.mercury.com/api/v1/accounts", { headers });
  }

  const text = await res.text();
  if (!res.ok) {
    console.error(`Mercury API error ${res.status}:\n${text}`);
    if (res.status === 403) {
      console.error("\nTip: enable Fetch Depository Accounts on your token.");
    }
    if (res.status === 401) {
      console.error("\nTip: include the full secret-token: prefix.");
    }
    process.exit(1);
  }

  const data = JSON.parse(text) as { accounts?: Account[] };
  const accounts = data.accounts ?? [];

  if (!accounts.length) {
    console.log("No accounts returned.");
    return;
  }

  console.log("\nMercury depository accounts:\n");
  for (const a of accounts) {
    const bal = a.availableBalance ?? a.currentBalance;
    const balStr = bal != null ? `$${bal.toLocaleString()}` : "—";
    console.log(`  ${a.name ?? "Account"}`);
    console.log(`    type:   ${a.type ?? "?"}`);
    console.log(`    status: ${a.status ?? "?"}`);
    console.log(`    balance: ${balStr}`);
    console.log(`    id:     ${a.id}`);
    console.log();
  }

  const checking =
    accounts.find((a) => /checking/i.test(a.type ?? "") || /checking/i.test(a.name ?? "")) ??
    accounts[0];

  console.log("─".repeat(60));
  console.log("Copy this into Vercel as MERCURY_DESTINATION_ACCOUNT_ID:\n");
  console.log(checking.id);
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
