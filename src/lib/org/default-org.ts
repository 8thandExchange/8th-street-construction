import { createAdminClient } from "@/lib/supabase/admin";

/**
 * BRIDGE HELPER — single-tenant era only.
 *
 * While exactly one organization exists (8th Street), everything provisioned
 * belongs to it. Multi-org signup (Phase 3) replaces every call site with an
 * explicit org resolved from the acting user's claim or the signup flow; this
 * helper then throws rather than guessing, so a missed call site fails loud
 * instead of assigning a member to the wrong tenant.
 */
export async function getDefaultOrgId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("organizations").select("id");
  if (error) {
    console.error("[org] could not resolve the default organization:", error.message);
    return null;
  }
  if (!data || data.length === 0) return null;
  if (data.length > 1) {
    throw new Error(
      "Multiple organizations exist — getDefaultOrgId() is single-tenant-era only. Pass the org explicitly."
    );
  }
  return data[0].id;
}
