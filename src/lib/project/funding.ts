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

/**
 * A row of the org-owned client_orgs directory (quick-assign partners on
 * Job Details). Was a hardcoded KNOWN_CLIENT_ORGS array; the entries are
 * data now so a second tenant can have different partners. Contact emails
 * live in the table — verify against the domain that actually gets read
 * before saving one (a transposed habitataugusta.org once sent a draw
 * notice to an address nobody reads).
 */
export type ClientOrg = {
  id: string;
  slug: string;
  name: string;
  email: string;
  description: string | null;
  default_funding: ProjectFundingType | string;
};

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

/**
 * Funding classification comes from funding_type alone. The slug fallback
 * for 608 Macon is gone: every live job carries its funding_type, and
 * keying off the slug silently misclassified every OTHER Habitat house
 * (1137 Merry etc. got the luxury draw template). 608-specific presets
 * (its city budget, its setup wizard shortcut) still gate on the slug —
 * that's project identity, not funding classification.
 */
export function isHabitatProject(project: {
  funding_type?: ProjectFundingType | string | null;
}): boolean {
  return project.funding_type === "habitat" || project.funding_type === "hud_home";
}

export function isHudHomeProject(project: {
  funding_type?: ProjectFundingType | string | null;
}): boolean {
  return project.funding_type === "hud_home";
}

export function getDrawTemplateKey(project: {
  funding_type?: ProjectFundingType | string | null;
}): "habitat" | "luxury" {
  return isHabitatProject(project) ? "habitat" : "luxury";
}

export function parseFundingType(value: string | null | undefined): ProjectFundingType {
  if (value === "habitat" || value === "hud_home" || value === "private") return value;
  return "private";
}

/* =====================================================================
 * Notice to proceed.
 *
 * Augusta-Richmond County reimburses Habitat partner and HUD HOME jobs,
 * and will not honor a request for payment covering work billed before it
 * issues the notice to proceed. So the notice gates *issuing* an invoice,
 * not drafting one — a draft can be built and edited while the notice is
 * still outstanding, which is how a draw gets staged ahead of the paperwork.
 * ===================================================================== */

export type NoticeToProceedState = {
  funding_type?: ProjectFundingType | string | null;
  notice_to_proceed_at?: string | null;
};

/** True when this job's funding makes the notice a precondition to billing. */
export function requiresNoticeToProceed(project: NoticeToProceedState): boolean {
  return isHabitatProject(project);
}

export function hasNoticeToProceed(project: NoticeToProceedState): boolean {
  return Boolean(project.notice_to_proceed_at);
}

/**
 * Null when the job may be invoiced. Otherwise the reason it may not, phrased
 * for whoever just clicked Send.
 */
export function noticeToProceedBlock(project: NoticeToProceedState): string | null {
  if (!requiresNoticeToProceed(project)) return null;
  if (hasNoticeToProceed(project)) return null;

  const funding = parseFundingType(
    typeof project.funding_type === "string" ? project.funding_type : null
  );
  const label = FUNDING_TYPE_SHORT[funding === "private" ? "hud_home" : funding];

  return (
    `This is a ${label} job with no notice to proceed on file. Augusta will not ` +
    `reimburse a draw billed before the notice issues. Record the notice on this ` +
    `job's Billing page, then send. The invoice can stay a draft until then.`
  );
}

/** Throwing form for server actions that are about to issue an invoice. */
export function assertClearedToInvoice(project: NoticeToProceedState): void {
  const blocked = noticeToProceedBlock(project);
  if (blocked) throw new Error(blocked);
}
