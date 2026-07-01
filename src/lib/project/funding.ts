/** Project funding types and HUD HOME program requirements (Augusta-Richmond County). */

export type ProjectFundingType = "private" | "habitat" | "hud_home";

export const FUNDING_TYPE_LABELS: Record<ProjectFundingType, string> = {
  private: "Private / Custom",
  habitat: "Habitat Partner",
  hud_home: "HUD HOME Fund",
};

export const FUNDING_TYPE_SHORT: Record<ProjectFundingType, string> = {
  private: "Private",
  habitat: "Habitat",
  hud_home: "HUD HOME",
};

/** Known portal clients — quick-assign in Job Details */
export const KNOWN_CLIENT_ORGS = [
  {
    slug: "habitat-augusta",
    name: "Augusta/CSRA Habitat for Humanity",
    email: "habitat@habitataugusta.org",
    description: "Primary partner · homeownership program builds",
    defaultFunding: "hud_home" as ProjectFundingType,
  },
] as const;

/**
 * HUD HOME / DCA CHIP requirements for Augusta-Richmond County area builds.
 * Sources: ARC Consolidated Plan (HOME entitlement), GA DCA CHIP manual (24 CFR 91/92),
 * Augusta Habitat homeownership criteria.
 */
export const HUD_HOME_REQUIREMENTS = {
  jurisdiction: "Augusta-Richmond County, GA",
  administeringBodies: [
    "Augusta-Richmond County (HUD HOME entitlement)",
    "Georgia DCA — Community HOME Investment Program (CHIP)",
    "Augusta/CSRA Habitat for Humanity (developer/sponsor)",
  ],
  regulatoryFramework: [
    "24 CFR Part 91 — Consolidated Plan requirements",
    "24 CFR Part 92 — HOME Investment Partnerships Program",
    "Environmental Review (EER) before construction",
    "Section 3 — economic opportunities for low-income workers",
    "Affirmatively Furthering Fair Housing (AFFH)",
    "Davis-Bacon Act (when applicable to HUD-assisted construction)",
  ],
  homebuyerCriteria: [
    "Income-eligible: generally 40–60% of area median income (program-specific)",
    "Richmond County FY2025 Habitat limits: $18,570–$82,000 by household size",
    "First-time homebuyer or meet program exception",
    "300+ hours sweat equity (Habitat partnership requirement)",
    "Ability to pay affordable no-interest mortgage",
    "Need for safe, decent, affordable housing",
  ],
  constructionCompliance: [
    "Sold to income-certified low/moderate-income homebuyer at closing",
    "Grant draw/disbursement requests with documentation",
    "Contractor procurement per federal/state requirements",
    "Project setup & close-out documents for grant administrator",
    "5-year affordability period (HOME resale restrictions)",
  ],
} as const;

export type ProjectFundingFields = {
  funding_type: ProjectFundingType;
  hud_grant_year: number | null;
  hud_program_notes: string | null;
  client_id: string | null;
};

export function isHabitatFunding(type: ProjectFundingType): boolean {
  return type === "habitat" || type === "hud_home";
}

export function isHudHomeFund(type: ProjectFundingType): boolean {
  return type === "hud_home";
}

export function isHabitatProject(project: {
  funding_type?: ProjectFundingType | string | null;
  slug?: string | null;
}): boolean {
  if (project.funding_type === "habitat" || project.funding_type === "hud_home") return true;
  return project.slug === "608-macon-ave";
}

export function isHudHomeProject(project: {
  funding_type?: ProjectFundingType | string | null;
  slug?: string | null;
}): boolean {
  if (project.funding_type === "hud_home") return true;
  return project.slug === "608-macon-ave";
}

export function getDrawTemplateKey(project: {
  funding_type?: ProjectFundingType | string | null;
  slug?: string | null;
}): "habitat" | "luxury" {
  return isHabitatProject(project) ? "habitat" : "luxury";
}

export function parseFundingType(value: string | null | undefined): ProjectFundingType {
  if (value === "habitat" || value === "hud_home" || value === "private") return value;
  return "private";
}
