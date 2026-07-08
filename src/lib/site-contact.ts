import { unstable_cache } from "next/cache";
import { createAnonymousClient } from "@/lib/supabase/anonymous";
import { BRAND } from "@/lib/brand/assets";

/**
 * Public contact info shown on the marketing site, edited from
 * Admin → Settings → Contact (site_settings key "contact").
 * Null/blank fields fall back to these defaults so the site never
 * renders an empty phone or email.
 */
export type SiteContact = {
  city: string;
  email: string;
  phone: string;
  serviceArea: string[];
};

export const SITE_CONTACT_DEFAULTS: SiteContact = {
  city: "Augusta, Georgia",
  email: "construction@8thandexchange.com",
  phone: BRAND.phone,
  serviceArea: [
    "Augusta",
    "Evans",
    "Martinez",
    "Grovetown",
    "North Augusta",
    "Columbia County",
    "Aiken",
  ],
};

export const SITE_CONTACT_TAG = "site-settings";

function parseSiteContact(value: unknown): SiteContact {
  const d = SITE_CONTACT_DEFAULTS;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return d;
  const v = value as Record<string, unknown>;
  const str = (x: unknown, fallback: string) =>
    typeof x === "string" && x.trim() ? x.trim() : fallback;
  const areas =
    Array.isArray(v.service_area) && v.service_area.every((s) => typeof s === "string")
      ? (v.service_area as string[]).filter((s) => s.trim())
      : d.serviceArea;
  return {
    city: str(v.city, d.city),
    email: str(v.email, d.email),
    phone: str(v.phone, d.phone),
    serviceArea: areas.length ? areas : d.serviceArea,
  };
}

export const getSiteContact = unstable_cache(
  async (): Promise<SiteContact> => {
    try {
      const supabase = createAnonymousClient();
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "contact")
        .maybeSingle();
      return parseSiteContact(data?.value);
    } catch {
      return SITE_CONTACT_DEFAULTS;
    }
  },
  ["site-contact"],
  { revalidate: 3600, tags: [SITE_CONTACT_TAG] }
);

/** E.164-style tel: href, e.g. "(706) 550-9581" → "+17065509581" */
export function contactTelHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}
