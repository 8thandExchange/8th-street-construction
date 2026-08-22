/**
 * Turn an accepted proposal into the merge fields a contract draft needs,
 * so price, scope, owner, and address are not retyped.
 */

export function scopeMdToContractParagraph(scopeMd: string, termsMd?: string | null): string {
  const cleaned = scopeMd
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
  const terms = (termsMd ?? "").trim();
  const body = terms ? `${cleaned} Terms: ${terms.replace(/\s+/g, " ")}` : cleaned;
  return body.length > 1200 ? `${body.slice(0, 1197).trimEnd()}…` : body;
}

export function ownerDisplayName(profile: {
  first_name?: string | null;
  last_name?: string | null;
  organization_name?: string | null;
  company?: string | null;
} | null): string {
  const org = profile?.organization_name?.trim() || profile?.company?.trim();
  if (org) return org;
  const person = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  return person || "Owner";
}

export function propertyAddressLine(project: {
  street_address?: string | null;
  location?: string | null;
}): string {
  return [project.street_address?.trim(), project.location?.trim()].filter(Boolean).join(", ");
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
