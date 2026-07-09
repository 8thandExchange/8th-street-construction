/** Draw schedule templates — percent must sum to 100 */

import { isHabitatProject, type ProjectFundingType } from "@/lib/project/funding";

export type DrawTemplateLine = {
  draw_number: number;
  title: string;
  percent: number;
  description: string;
};

/** Standard luxury custom home (5 draws) */
export const LUXURY_DRAW_TEMPLATE: DrawTemplateLine[] = [
  {
    draw_number: 1,
    title: "Foundation / Slab",
    percent: 10,
    description: "Footings, slab, and foundation inspection passed.",
  },
  {
    draw_number: 2,
    title: "Framing & Dry-In",
    percent: 25,
    description: "Structure up, roof on, windows and doors in.",
  },
  {
    draw_number: 3,
    title: "Mechanicals Rough-In",
    percent: 20,
    description: "Plumbing, electrical, and HVAC rough complete.",
  },
  {
    draw_number: 4,
    title: "Drywall & Interior Prep",
    percent: 15,
    description: "Insulation, drywall hung, and interior prep done.",
  },
  {
    draw_number: 5,
    title: "Finishes & Closeout",
    percent: 30,
    description: "Cabinets, floors, paint, final inspection, and keys.",
  },
];

/** Habitat for Humanity — tied to build phases */
export const HABITAT_DRAW_TEMPLATE: DrawTemplateLine[] = [
  {
    draw_number: 1,
    title: "Site Work & Foundation",
    percent: 15,
    description: "Lot ready, permits posted, slab poured, termite letter in hand.",
  },
  {
    draw_number: 2,
    title: "Framing & Dry-In",
    percent: 25,
    description: "Walls and roof up. House is weather-tight.",
  },
  {
    draw_number: 3,
    title: "Rough Utilities",
    percent: 20,
    description: "Plumbing, electrical, and HVAC roughed in and inspected.",
  },
  {
    draw_number: 4,
    title: "Insulation & Drywall",
    percent: 15,
    description: "Insulation in, drywall hung, ready for paint and trim.",
  },
  {
    draw_number: 5,
    title: "Finishes & Move-In Ready",
    percent: 25,
    description: "Floors, cabinets, fixtures, final CO, and handover.",
  },
];

/** 608 Macon Ave — Habitat program metadata (NOT client billing amount) */
export const HABITAT_608_MACON = {
  slug: "608-macon-ave",
  program: "Habitat for Humanity Augusta",
  heatedSquareFeet: 1425,
  estimateFile: "data/estimates/608-macon-habitat-estimate-corrected.xlsx",
  architect: "Booker + Vick (Job 2615)",
  /** Default portal contact — override in Job Details if needed */
  clientOrgName: "Habitat for Humanity Augusta",
  clientContactEmail: "habitat@habitataugusta.org",
} as const;

export function getDrawTemplateForProject(
  projectOrSlug:
    | { funding_type?: ProjectFundingType | string | null; slug?: string | null }
    | string
): DrawTemplateLine[] {
  const project =
    typeof projectOrSlug === "string" ? { slug: projectOrSlug } : projectOrSlug;
  return isHabitatProject(project) ? HABITAT_DRAW_TEMPLATE : LUXURY_DRAW_TEMPLATE;
}

/** @deprecated Use isHabitatProject({ funding_type, slug }) */
export function isHabitat608Project(slug: string): boolean {
  return slug === HABITAT_608_MACON.slug;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Job prefix for invoice numbers, from the project slug:
 * "1137-merry-street" → "1137-MERRY", "608-macon-ave" → "608-MACON".
 * Keeps every invoice traceable to its job at a glance.
 */
export function invoiceJobPrefix(slug: string | null | undefined): string {
  const tokens = String(slug ?? "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (!tokens.length) return "JOB";
  return tokens.slice(0, 2).join("-").slice(0, 16);
}
