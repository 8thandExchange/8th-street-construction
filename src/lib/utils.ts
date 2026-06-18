import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL-safe project path segment, e.g. "608 Macon Ave" → "608-macon-ave" */
export function slugifyProjectTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 10) return input;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const PROJECT_CATEGORY_LABELS: Record<string, string> = {
  custom_home: "Custom Home",
  residential_renovation: "Residential Renovation",
  commercial_new_build: "Commercial New Build",
  tenant_buildout: "Tenant Buildout",
  design_build: "Design-Build",
  historic_restoration: "Historic Restoration",
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-copper-300/15 text-copper-300 border-copper-300/30",
  contacted: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  qualified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  proposal_sent: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  won: "bg-emerald-600/20 text-emerald-300 border-emerald-600/40",
  lost: "bg-stone-500/15 text-stone-400 border-stone-500/30",
  archived: "bg-stone-700/15 text-stone-500 border-stone-700/30",
};
