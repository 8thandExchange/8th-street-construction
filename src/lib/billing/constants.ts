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

/**
 * City-approved budget for 608 Macon (House #87) — from "608 Macon Budget
 * for Build". Every invoice line bills against one of these City #s, the
 * same way 3035 Hummingbird was billed. Total: $239,665.
 */
export const HABITAT_608_MACON_CITY_BUDGET: {
  city_number: number;
  description: string;
  budget_amount: number;
}[] = [
  { city_number: 1, description: "Foundation / Slab", budget_amount: 11300 },
  { city_number: 2, description: "Stone / Brick", budget_amount: 6300 },
  { city_number: 3, description: "Framing/Trusses/Labor", budget_amount: 35000 },
  { city_number: 4, description: "Plumbing / Plumbing Fixtures", budget_amount: 16000 },
  { city_number: 5, description: "Appliances", budget_amount: 3200 },
  { city_number: 6, description: "Electrical", budget_amount: 9800 },
  { city_number: 7, description: "Lighting", budget_amount: 2200 },
  { city_number: 8, description: "HVAC material & Labor", budget_amount: 14000 },
  { city_number: 9, description: "Roofing", budget_amount: 7500 },
  { city_number: 10, description: "Insulation / Drywall", budget_amount: 10700 },
  { city_number: 11, description: "Siding", budget_amount: 14500 },
  { city_number: 12, description: "Doors / Windows", budget_amount: 9000 },
  { city_number: 13, description: "Sidewalk", budget_amount: 1200 },
  { city_number: 14, description: "Flooring", budget_amount: 10000 },
  { city_number: 15, description: "Dumpster", budget_amount: 2000 },
  { city_number: 16, description: "Cabinets", budget_amount: 6000 },
  { city_number: 17, description: "Countertops", budget_amount: 4000 },
  { city_number: 18, description: "Bath Shelf / Mirror / Accessories", budget_amount: 1000 },
  { city_number: 19, description: "Trim", budget_amount: 3200 },
  { city_number: 20, description: "Painting", budget_amount: 6300 },
  { city_number: 21, description: "Gutters", budget_amount: 2000 },
  { city_number: 22, description: "Driveway", budget_amount: 3500 },
  { city_number: 23, description: "Landscaping", budget_amount: 9000 },
  { city_number: 24, description: "Lot Prep / Silt Fence", budget_amount: 9100 },
  { city_number: 25, description: "Permits / Engineering / Survey / etc", budget_amount: 2600 },
  { city_number: 26, description: "Construction Labor (entire project)", budget_amount: 30000 },
  { city_number: 27, description: "Warranty / Pest Control / Columns", budget_amount: 2000 },
  { city_number: 28, description: "Electric / Water / Water Tap", budget_amount: 2800 },
  { city_number: 29, description: "Portable Toilet (entire project)", budget_amount: 500 },
  { city_number: 30, description: "Cleanup Interior / Exterior", budget_amount: 3000 },
  { city_number: 31, description: "Blinds", budget_amount: 1200 },
  { city_number: 32, description: "Printing of Plans", budget_amount: 400 },
  { city_number: 33, description: "Blower Test", budget_amount: 365 },
];

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

/** Rounded money for budgets, contract values, and schedule figures. */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Exact money for invoice amounts — always shows cents. An amount due of
 * $63,834.90 must never display as $63,835.
 */
export function formatMoneyExact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

/** Tag stored in project_documents.description linking a document to an invoice. */
export function invoiceAttachmentTag(invoiceNumber: string): string {
  return `Attached to invoice ${invoiceNumber}`;
}
