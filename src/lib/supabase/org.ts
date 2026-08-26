import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Org-scoped database access — the successor to bare createAdminClient()
 * (docs/rollout/tenancy-design.md, "Service-role strategy").
 *
 * Every service-role query is a cross-tenant leak waiting for a missed
 * filter once a second organization exists. This context is the seam that
 * closes them: it authenticates the caller, resolves and VERIFIES their
 * active organization, and hands back a db handle together with the orgId
 * every query must scope by.
 *
 * Bridge-era contract (single org, policies still is_admin()-based):
 *  - `db` is the service-role client — callers MUST filter with
 *    `.eq("org_id", ctx.orgId)` on org-keyed tables as they gain the column.
 *  - When the org-scoped RLS rewrite lands, `db` becomes a claim-bound
 *    client and the database enforces what the filter expresses; call sites
 *    written against this contract need no second migration.
 *
 * New server code takes this; reaching for createAdminClient() directly now
 * trips the ratchet test in admin-client-usage.test.ts.
 */

export type OrgContext = {
  /** Service-role handle today; claim-scoped handle after the RLS rewrite. */
  db: ReturnType<typeof createAdminClient>;
  orgId: string;
  userId: string;
};

export async function createOrgContext(): Promise<OrgContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  // The claim names the ACTIVE org; membership decides whether it grants
  // anything. A stale or wrong claim must never scope queries.
  const claimed = user.app_metadata?.org_id;
  let orgId = typeof claimed === "string" && claimed ? claimed : null;

  if (orgId) {
    const { data: member } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!member) orgId = null;
  }

  if (!orgId) {
    // No (valid) claim yet — sessions minted before the tenancy migration
    // refresh into one lazily. Unambiguous only while a person belongs to
    // exactly one org; with several, the claim is the only tiebreaker.
    const { data: memberships } = await admin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id);
    if (memberships?.length === 1) orgId = memberships[0].org_id;
    else if ((memberships?.length ?? 0) > 1) {
      throw new Error("Multiple organizations — sign out and back in to refresh the active one.");
    }
  }

  if (!orgId) throw new Error("This login does not belong to an organization.");

  return { db: admin, orgId, userId: user.id };
}
