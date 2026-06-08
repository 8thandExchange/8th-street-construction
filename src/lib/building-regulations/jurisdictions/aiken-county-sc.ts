import type { JurisdictionRegulations } from "../types";

export const AIKEN_COUNTY_SC: JurisdictionRegulations = {
  key: "aiken-county-sc",
  name: "Aiken County",
  state: "SC",
  ahj: "Aiken County Building & Code Enforcement",
  contactPhone: "803-642-1520",
  contactAddress: "1930 University Parkway, Aiken, SC 29801",
  adoptedCodes: [
    "South Carolina Building Codes Act — residential per S.C. Residential Code",
    "2021 IRC with South Carolina amendments (verify current adoption at time of permit)",
    "SCDHEC stormwater and erosion control where applicable",
  ],
  permitThresholds: [
    "Permit required for new residential construction and structural work",
    "Residential Building Blueprint (RBB) compliance for applicable projects",
    "Separate permits for electrical, plumbing, mechanical, and gas trades",
  ],
  planReviewRequirements: [
    "Completed permit application",
    "SC PE-stamped structural plans where required",
    "Site plan with setbacks and floodplain notation",
    "RBB documentation for qualifying residential projects",
    "Septic or sewer approval from SCDHEC or utility provider",
  ],
  inspectionSequence: [
    "Footing / foundation",
    "Slab / under-slab",
    "Framing",
    "Rough MEP",
    "Insulation",
    "Final building and trades",
    "Certificate of Occupancy",
  ],
  sections: [
    {
      title: "Cross-River Projects",
      items: [
        "North Augusta and surrounding SC addresses use Aiken County — not Augusta-Richmond",
        "Verify AHJ before ordering stamped plans; GA and SC plan sets are not interchangeable",
        "Lien waiver and contractor licensing rules differ from Georgia",
      ],
    },
  ],
  aliases: [
    "aiken county",
    "aiken county, sc",
    "aiken county sc",
    "north augusta, sc",
    "north augusta sc",
  ],
};
