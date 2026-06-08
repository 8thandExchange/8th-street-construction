import type { JurisdictionRegulations } from "../types";

export const COLUMBIA_COUNTY_GA: JurisdictionRegulations = {
  key: "columbia-county-ga",
  name: "Columbia County",
  state: "GA",
  ahj: "Columbia County Building Inspections & Permitting",
  contactPhone: "706-868-3400",
  contactAddress: "630 Ronald Reagan Drive, Evans, GA 30809",
  portalUrl: "https://www.columbiacountyga.gov",
  adoptedCodes: [
    "Georgia State Minimum Standard Codes (2024 ICC family)",
    "2024 IRC with Georgia amendments for residential work",
    "Georgia energy compliance documentation required on new construction",
  ],
  permitThresholds: [
    "Building permit required for new construction, additions, and structural alterations",
    "Trade permits required for electrical, plumbing, mechanical, and gas work per county policy",
    "Swimming pools, decks, and retaining walls typically require engineered plans",
  ],
  planReviewRequirements: [
    "Completed permit application with property owner authorization",
    "Stamped architectural and structural drawings",
    "Site plan with setbacks, impervious surface calculations, and drainage",
    "Soils / geotechnical report for new slabs and footings in expansive clay areas",
    "REScheck or equivalent energy compliance",
    "Septic or sewer connection documentation as applicable",
  ],
  inspectionSequence: [
    "Footing / foundation",
    "Under-slab plumbing and termite pretreat",
    "Framing and shear / bracing",
    "Rough MEP trades",
    "Insulation and air barrier",
    "Final trades and building",
    "Certificate of Occupancy",
  ],
  sections: [
    {
      title: "CSRA Notes",
      items: [
        "Evans, Martinez, and Grovetown addresses typically fall under Columbia County AHJ",
        "Confirm jurisdiction on the tax parcel — some addresses near county lines require survey verification",
        "HOA design review may be required in master-planned communities before permit submittal",
      ],
    },
    {
      title: "Site & Drainage",
      items: [
        "Stormwater and erosion control plan where disturbance exceeds county thresholds",
        "Impervious surface limits per zoning and recorded covenants",
        "Downspouts must tie into an approved drainage plan",
      ],
    },
  ],
  aliases: [
    "columbia county",
    "columbia county, ga",
    "columbia county ga",
    "evans, ga",
    "evans ga",
    "martinez, ga",
    "grovetown, ga",
  ],
};
