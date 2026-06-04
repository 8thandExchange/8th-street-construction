/**
 * Company-wide compliance checklist seed — GA + SC builder operating in CSRA.
 * Run once via admin "Initialize compliance" or migration seed script.
 */

export type ComplianceSeedItem = {
  title: string;
  description?: string;
  category: "license" | "insurance" | "bond" | "registration" | "certification" | "tax" | "safety" | "other";
  jurisdiction: string;
  renewal_lead_days?: number;
  renewal_urgent_days?: number;
  renewal_cycle?: string;
  expires_at?: string | null;
};

export const COMPANY_COMPLIANCE_SEED: ComplianceSeedItem[] = [
  {
    title: "Georgia Residential Contractor License",
    description: "State license via GA Secretary of State Professional Licensing — verify classification matches work performed.",
    category: "license",
    jurisdiction: "Georgia",
    renewal_lead_days: 90,
    renewal_urgent_days: 30,
    renewal_cycle: "Annual / per board cycle",
  },
  {
    title: "South Carolina Residential Builder (RBB) License",
    description: "Individual license via SC LLR Residential Builders Commission. Renews June 30 of every even-numbered year.",
    category: "license",
    jurisdiction: "South Carolina",
    renewal_lead_days: 90,
    renewal_urgent_days: 30,
    renewal_cycle: "Biennial — June 30 even years",
  },
  {
    title: "SC Certificate of Authorization (COA)",
    description: "Required if operating under LLC/corp in South Carolina — affiliate business name with RBB.",
    category: "registration",
    jurisdiction: "South Carolina",
    renewal_lead_days: 60,
    renewal_cycle: "Biennial with RBB",
  },
  {
    title: "SC Residential Builder Surety Bond ($15,000)",
    description: "Original bond on file with SC LLR when project cost exceeds $5,000.",
    category: "bond",
    jurisdiction: "South Carolina",
    renewal_lead_days: 45,
    renewal_urgent_days: 14,
  },
  {
    title: "General Liability Insurance",
    description: "Minimum limits per contract/lender requirements; additional insured endorsements for clients & lenders.",
    category: "insurance",
    jurisdiction: "Multi-state",
    renewal_lead_days: 60,
    renewal_urgent_days: 14,
    renewal_cycle: "Annual policy renewal",
  },
  {
    title: "Workers Compensation Insurance",
    description: "Required when employees on payroll — GA and SC both enforce; verify sub waiver process documented.",
    category: "insurance",
    jurisdiction: "Georgia / South Carolina",
    renewal_lead_days: 45,
    renewal_urgent_days: 14,
    renewal_cycle: "Annual",
  },
  {
    title: "Commercial Auto Insurance",
    description: "Covers company vehicles and job site transit — list all VINs.",
    category: "insurance",
    jurisdiction: "Multi-state",
    renewal_lead_days: 45,
    renewal_urgent_days: 14,
  },
  {
    title: "Umbrella / Excess Liability",
    description: "Typical high-end residential requirement — $1M–$2M+ umbrella.",
    category: "insurance",
    jurisdiction: "Multi-state",
    renewal_lead_days: 45,
    renewal_urgent_days: 14,
  },
  {
    title: "Builder's Risk / Course of Construction Template",
    description: "Master policy or per-project binders — verify lender named mortgagee when financed.",
    category: "insurance",
    jurisdiction: "Per project",
    renewal_lead_days: 30,
  },
  {
    title: "Augusta-Richmond County Business License / Occupational Tax",
    description: "Local business license for GA operations base.",
    category: "license",
    jurisdiction: "Augusta-Richmond County, GA",
    renewal_lead_days: 60,
    renewal_urgent_days: 14,
    renewal_cycle: "Annual",
  },
  {
    title: "Aiken County Business License (if applicable)",
    description: "Required for SC-side office or recurring work in Aiken County.",
    category: "license",
    jurisdiction: "Aiken County, SC",
    renewal_lead_days: 60,
  },
  {
    title: "Georgia Secretary of State — Business Entity Annual Registration",
    description: "LLC/corp annual registration to remain in good standing.",
    category: "registration",
    jurisdiction: "Georgia",
    renewal_lead_days: 60,
    renewal_urgent_days: 14,
    renewal_cycle: "Annual by registration anniversary",
  },
  {
    title: "South Carolina Secretary of State — Annual Report",
    description: "If qualified to do business in SC.",
    category: "registration",
    jurisdiction: "South Carolina",
    renewal_lead_days: 60,
  },
  {
    title: "Federal EIN & Tax Filings Current",
    description: "Quarterly payroll, annual business returns — coordinate with CPA.",
    category: "tax",
    jurisdiction: "Federal",
    renewal_lead_days: 30,
    renewal_cycle: "Quarterly / annual",
  },
  {
    title: "OSHA / Jobsite Safety Program Review",
    description: "Annual review of fall protection, ladder policy, PPE, heat illness (GA/SC summers).",
    category: "safety",
    jurisdiction: "Company-wide",
    renewal_lead_days: 30,
    renewal_cycle: "Annual review",
  },
  {
    title: "EPA RRP Certification (lead-safe practices)",
    description: "Required for pre-1978 housing renovation — keep firm & renovator certs current.",
    category: "certification",
    jurisdiction: "Federal EPA",
    renewal_lead_days: 60,
    renewal_cycle: "5-year certification",
  },
  {
    title: "Subcontractor Default Insurance / Prequal Packet",
    description: "Standard COI requirements, W-9, lien waiver forms on file for active subs.",
    category: "other",
    jurisdiction: "Company-wide",
    renewal_lead_days: 30,
    renewal_cycle: "Per sub annually",
  },
  {
    title: "NPDES / Stormwater Operator Certification",
    description: "If performing land disturbance over thresholds — SCDHEC or GA EPD as applicable.",
    category: "certification",
    jurisdiction: "Georgia / South Carolina",
    renewal_lead_days: 60,
  },
];
