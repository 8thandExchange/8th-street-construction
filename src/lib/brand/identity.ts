import { unstable_cache } from "next/cache";
import { createAnonymousClient } from "@/lib/supabase/anonymous";
import { BRAND } from "@/lib/brand/assets";
import { SITE_CONTACT_TAG } from "@/lib/site-contact";

/**
 * The business identity public surfaces render — name, tagline, parent
 * line, phone, email — edited from Admin → Settings (site_settings key
 * "identity", one of the public marketing keys). The BRAND constants
 * remain as the fallback so nothing ever renders blank; identity-as-data
 * means the row wins when present, and a second tenant gets their own.
 *
 * Same mechanism as getSiteContact on purpose: anon-readable setting,
 * hour cache, revalidated by the settings page via SITE_CONTACT_TAG.
 */
export type SiteIdentity = {
  name: string;
  tagline: string;
  parent: string;
  phone: string;
  email: string;
};

export const SITE_IDENTITY_DEFAULTS: SiteIdentity = { ...BRAND };

function parseSiteIdentity(value: unknown): SiteIdentity {
  const d = SITE_IDENTITY_DEFAULTS;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return d;
  const v = value as Record<string, unknown>;
  const str = (x: unknown, fallback: string) =>
    typeof x === "string" && x.trim() ? x.trim() : fallback;
  return {
    name: str(v.name, d.name),
    tagline: str(v.tagline, d.tagline),
    parent: str(v.parent, d.parent),
    phone: str(v.phone, d.phone),
    email: str(v.email, d.email),
  };
}

export const getSiteIdentity = unstable_cache(
  async (): Promise<SiteIdentity> => {
    try {
      const supabase = createAnonymousClient();
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "identity")
        .maybeSingle();
      return parseSiteIdentity(data?.value);
    } catch {
      return SITE_IDENTITY_DEFAULTS;
    }
  },
  ["site-identity"],
  { revalidate: 3600, tags: [SITE_CONTACT_TAG] }
);

/** E.164-style tel: href, e.g. "(706) 550-9581" → "+17065509581" */
export function identityTelHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}
