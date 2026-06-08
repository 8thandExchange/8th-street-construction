import type { JurisdictionRegulations } from "../types";

export const AUGUSTA_RICHMOND_GA: JurisdictionRegulations = {
  key: "augusta-richmond-ga",
  name: "Augusta-Richmond County",
  state: "GA",
  ahj: "Augusta-Richmond County Planning & Development Department",
  contactPhone: "706-312-5050 (Option 4)",
  contactAddress: "1803 Marvin Griffin Rd, Augusta, GA 30906",
  portalUrl: "https://www.augustaga.gov/2101/Building-Permits",
  adoptedCodes: [
    "Georgia State Minimum Standard Codes (2024 ICC family effective Jan 1, 2026)",
    "2024 IRC / IBC / IPC / IMC / IFGC / ISPSC / IECC with Georgia amendments",
    "2023 NEC with Georgia amendments",
    "Georgia energy compliance (REScheck / COMcheck as applicable)",
  ],
  permitThresholds: [
    "Permit required for new residential construction, additions, alterations, and most trade work over $500",
    "New residential permit fee: approximately $0.24 per square foot under roof",
    "Accessory structures over 120 sq ft require permits; setbacks and easements still apply below that threshold",
    "Electrical, plumbing, mechanical, and gas work over $500 requires separate trade permits",
  ],
  planReviewRequirements: [
    "Completed permit application (signed and dated)",
    "Stamped architectural and structural plan set",
    "Plot / site plan with setbacks, easements, and floodplain notation",
    "REScheck energy compliance documentation",
    "Water tap and sewer tap receipts (or septic tank receipt if applicable)",
    "Residential compacted fill material documentation",
    "Georgia termite pretreatment memorandum",
    "Letter of authorization if owner is not the applicant",
  ],
  inspectionSequence: [
    "Footing / foundation before pour",
    "Slab / under-slab plumbing before cover",
    "Framing / structural before insulation and drywall",
    "Rough electrical, plumbing, mechanical, and gas",
    "Insulation and energy envelope",
    "Final building, electrical, plumbing, mechanical, and gas",
    "Certificate of Occupancy or Certificate of Completion prior to move-in",
  ],
  sections: [
    {
      title: "Setbacks & Zoning",
      items: [
        "Verify front, side, and rear setbacks against the recorded plat and zoning district",
        "Confirm HOA / ARC written approval before exterior materials are finalized",
        "Tree save and buffer requirements per site plan and local ordinance",
      ],
    },
    {
      title: "Georgia-Specific Requirements",
      items: [
        "File Notice of Commencement with the clerk of court per O.C.G.A.",
        "Termite pretreatment certificate required before slab pour in most jurisdictions",
        "Erosion and sediment control (NPDES) where land disturbance exceeds thresholds",
        "Fire sprinklers are optional for one- and two-family dwellings under Georgia law",
      ],
    },
    {
      title: "Inspection Scheduling",
      items: [
        "Request inspections online or email pddtechs@augustaga.gov",
        "Include permit number, contact name, phone, and inspection type",
        "Requests by 4:00 PM schedule for the next business day",
        "Failed inspection fees must be paid before CO/CC release",
      ],
    },
  ],
  aliases: [
    "augusta-richmond",
    "augusta richmond",
    "augusta-richmond county",
    "augusta richmond county",
    "augusta, ga",
    "augusta ga",
    "richmond county, ga",
    "richmond county ga",
    "city of augusta",
  ],
};
