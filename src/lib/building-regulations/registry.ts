import { AIKEN_COUNTY_SC } from "./jurisdictions/aiken-county-sc";
import { AUGUSTA_RICHMOND_GA } from "./jurisdictions/augusta-richmond-ga";
import { COLUMBIA_COUNTY_GA } from "./jurisdictions/columbia-county-ga";
import type { JurisdictionRegulations } from "./types";

export const JURISDICTION_REGULATIONS: JurisdictionRegulations[] = [
  AUGUSTA_RICHMOND_GA,
  COLUMBIA_COUNTY_GA,
  AIKEN_COUNTY_SC,
];

export function getRegulationsByKey(key: string): JurisdictionRegulations | null {
  return JURISDICTION_REGULATIONS.find((j) => j.key === key) ?? null;
}

function normalizeJurisdiction(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveJurisdiction(
  jurisdiction?: string | null,
  location?: string | null
): JurisdictionRegulations {
  const candidates = [jurisdiction, location].filter(Boolean) as string[];
  if (!candidates.length) return AUGUSTA_RICHMOND_GA;

  for (const raw of candidates) {
    const normalized = normalizeJurisdiction(raw);

    const exact = JURISDICTION_REGULATIONS.find(
      (j) =>
        j.key === normalized.replace(/\s+/g, "-") ||
        normalizeJurisdiction(j.name) === normalized
    );
    if (exact) return exact;

    for (const j of JURISDICTION_REGULATIONS) {
      if (j.aliases.some((alias) => normalized.includes(normalizeJurisdiction(alias)))) {
        return j;
      }
      if (normalized.includes(normalizeJurisdiction(j.name))) {
        return j;
      }
    }
  }

  return AUGUSTA_RICHMOND_GA;
}

export function listJurisdictions() {
  return JURISDICTION_REGULATIONS.map((j) => ({
    key: j.key,
    name: j.name,
    state: j.state,
  }));
}
