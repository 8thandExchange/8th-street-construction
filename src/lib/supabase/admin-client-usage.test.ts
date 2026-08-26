import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import baseline from "./admin-client-baseline.json";

/**
 * Ratchet on service-role usage (docs/rollout/tenancy-design.md).
 *
 * createAdminClient() bypasses row-level security, so under multi-tenancy
 * every call site is a potential cross-tenant leak. The files that already
 * use it are frozen in admin-client-baseline.json and get migrated to
 * createOrgContext() (src/lib/supabase/org.ts) as the schema re-keying
 * reaches them. The count only goes DOWN:
 *
 *  - A NEW file importing supabase/admin fails this test. Use
 *    createOrgContext() instead; genuinely tenant-less work (webhook
 *    ingestion before attribution, platform jobs) may be added to the
 *    baseline deliberately, in its own reviewed commit.
 *  - A file that stops importing it must also leave the baseline, so the
 *    ratchet stays tight.
 */

const IMPORT_PATTERN = /from\s+["'][^"']*supabase\/admin["']/;
const DEFINITION_FILE = "src/lib/supabase/admin.ts";

function tsFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFilesUnder(path));
    else if (/\.tsx?$/.test(entry.name)) out.push(path.replace(/\\/g, "/"));
  }
  return out;
}

describe("createAdminClient usage ratchet", () => {
  const current = tsFilesUnder("src")
    .filter((f) => f !== DEFINITION_FILE)
    .filter((f) => IMPORT_PATTERN.test(readFileSync(f, "utf8")))
    .sort();

  const frozen = [...(baseline as string[])].sort();

  it("no new file imports the service-role client", () => {
    const added = current.filter((f) => !frozen.includes(f));
    expect(
      added,
      `New service-role usage in: ${added.join(", ")}. Use createOrgContext() from ` +
        `src/lib/supabase/org.ts — or, for genuinely tenant-less platform work, add the ` +
        `file to admin-client-baseline.json in its own reviewed commit.`
    ).toEqual([]);
  });

  it("the baseline shrinks when files migrate off it", () => {
    const stale = frozen.filter((f) => !current.includes(f));
    expect(
      stale,
      `These files no longer import supabase/admin — remove them from ` +
        `admin-client-baseline.json so the ratchet stays tight: ${stale.join(", ")}`
    ).toEqual([]);
  });
});
