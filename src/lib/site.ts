import { BRAND, getSiteUrl } from "@/lib/brand/assets";

export const SITE_URL = getSiteUrl();
export const SITE_NAME = BRAND.name;
export const CONTACT_EMAIL = BRAND.email;

/** Default invoice footer — check mailing address for remittance by mail. */
export const INVOICE_FOOTER =
  "Make checks payable to 8th Street Construction, LLC.\nMail to: 32 8th Street, Suite 201, Augusta, GA 30901";
