/**
 * One-time backfill: encrypt vendors.tax_id and vendors.remit_account_number
 * that are still stored in the clear.
 *
 * This cannot be a SQL migration — the encryption key deliberately does not
 * live in the database, so only the application can do this.
 *
 * Safe to re-run: values already carrying the enc:v1 prefix are skipped, so
 * a partial run can simply be run again. Run it with the SAME
 * FIELD_ENCRYPTION_KEY the deployed app uses, or the app will not be able to
 * read what this writes.
 *
 *   npm run vendors:encrypt          # report what would change
 *   npm run vendors:encrypt -- --run # actually write
 */

import { createClient } from "@supabase/supabase-js";
import {
  encryptField,
  isEncrypted,
  lastFour,
  vendorFieldContext,
} from "../src/lib/crypto/field-encryption";

const APPLY = process.argv.includes("--run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Load your env first."
  );
  process.exit(1);
}
if (!process.env.FIELD_ENCRYPTION_KEY) {
  console.error(
    "Missing FIELD_ENCRYPTION_KEY. Generate one with `openssl rand -base64 32`,\n" +
      "set it in Vercel AND in your local env, then re-run."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Row = {
  id: string;
  name: string;
  tax_id: string | null;
  tax_id_last4: string | null;
  remit_account_number: string | null;
  remit_account_last4: string | null;
};

async function main() {
  const { data, error } = await admin
    .from("vendors")
    .select("id, name, tax_id, tax_id_last4, remit_account_number, remit_account_last4")
    .order("name");

  if (error) {
    console.error("Could not read vendors:", error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];
  let changed = 0;
  let skipped = 0;

  for (const row of rows) {
    const patch: Record<string, string | null> = {};

    if (row.tax_id && !isEncrypted(row.tax_id)) {
      patch.tax_id = encryptField(row.tax_id, vendorFieldContext("tax_id", row.id));
      // The migration filled this from plaintext, but re-derive so a row it
      // missed (fewer than 4 digits, added since) still ends up consistent.
      patch.tax_id_last4 = row.tax_id_last4 ?? lastFour(row.tax_id);
    }

    if (row.remit_account_number && !isEncrypted(row.remit_account_number)) {
      patch.remit_account_number = encryptField(
        row.remit_account_number,
        vendorFieldContext("remit_account_number", row.id)
      );
      patch.remit_account_last4 = row.remit_account_last4 ?? lastFour(row.remit_account_number);
    }

    if (Object.keys(patch).length === 0) {
      skipped += 1;
      continue;
    }

    const fields = Object.keys(patch)
      .filter((k) => !k.endsWith("_last4"))
      .join(", ");
    console.log(`${APPLY ? "encrypting" : "would encrypt"}  ${row.name}  [${fields}]`);

    if (APPLY) {
      const { error: updateError } = await admin
        .from("vendors")
        .update(patch)
        .eq("id", row.id)
        .select("id");
      if (updateError) {
        console.error(`  FAILED for ${row.name}: ${updateError.message}`);
        process.exitCode = 1;
        continue;
      }
    }
    changed += 1;
  }

  console.log(
    `\n${rows.length} vendors · ${changed} ${APPLY ? "encrypted" : "to encrypt"} · ${skipped} already done or nothing to encrypt`
  );
  if (!APPLY && changed > 0) console.log("Dry run. Re-run with --run to write.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
