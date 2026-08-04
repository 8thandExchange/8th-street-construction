/**
 * Repo-hosted vendor logos, keyed by slugified vendor name. Used as the
 * display fallback when a vendor has no uploaded logo in storage — an
 * uploaded logo (vendors.logo_path) always wins.
 */
const PUBLIC_VENDOR_LOGOS: Record<string, string> = {
  "monte-cristo-consulting": "/img/vendors/monte-cristo-consulting.png",
};

export function publicVendorLogo(name: string): string | null {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return PUBLIC_VENDOR_LOGOS[slug] ?? null;
}
