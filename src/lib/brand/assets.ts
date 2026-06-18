export const BRAND = {
  name: "8th Street Construction",
  tagline: "Augusta, Georgia",
  parent: "A division of 8th and Exchange Capital",
  phone: "(706) 555-0100",
  email: "hello@8thstreetconstruction.com",
} as const;

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com").replace(
    /\/$/,
    ""
  );
}

export type BrandLogoVariant = "on-light" | "on-dark" | "icon";

/** Absolute URLs for email clients and external surfaces */
export function brandLogoUrl(variant: BrandLogoVariant = "on-light") {
  const site = getSiteUrl();
  switch (variant) {
    case "on-dark":
      return `${site}/img/logo-horizontal-navy.svg`;
    case "icon":
      return `${site}/img/logo-icon.svg`;
    default:
      return `${site}/img/logo-horizontal-parchment.svg`;
  }
}
