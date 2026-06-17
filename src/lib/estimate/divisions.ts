/** CSI-style divisions for residential estimating — plain English labels */

export type EstimateDivision = {
  code: string;
  tradeLabel: string;
  description: string;
};

export const ESTIMATE_DIVISIONS: EstimateDivision[] = [
  { code: "DIV-01", tradeLabel: "General & Permits", description: "Permits, supervision, site setup, insurance" },
  { code: "DIV-03", tradeLabel: "Concrete", description: "Slab, footings, termite pretreat" },
  { code: "DIV-06", tradeLabel: "Framing", description: "Trusses, walls, floor system, stairs" },
  { code: "DIV-07", tradeLabel: "Roof & Siding", description: "Shingles, metal porch roof, siding, insulation" },
  { code: "DIV-08", tradeLabel: "Doors & Windows", description: "Exterior and interior openings" },
  { code: "DIV-09", tradeLabel: "Interior Finishes", description: "Drywall, paint, flooring, trim" },
  { code: "DIV-10", tradeLabel: "Bath Accessories", description: "Mirrors, bars, hooks" },
  { code: "DIV-11", tradeLabel: "Appliances", description: "Range, dishwasher, water heater" },
  { code: "DIV-12", tradeLabel: "Cabinets & Counters", description: "Kitchen cabinets, countertops, closets" },
  { code: "DIV-22", tradeLabel: "Plumbing", description: "Rough and trim, fixtures" },
  { code: "DIV-23", tradeLabel: "HVAC", description: "Heat pump, ducts, exhaust fans" },
  { code: "DIV-26", tradeLabel: "Electrical", description: "Rough, trim, panel, fixtures" },
  { code: "DIV-31", tradeLabel: "Site Work", description: "Grading, haul-off, erosion" },
  { code: "DIV-32", tradeLabel: "Drive & Landscape", description: "Driveway, walks, sod" },
  { code: "DIV-33", tradeLabel: "Utility Taps", description: "Water, sewer, electric service" },
];

/** 608 Macon permit-set estimate — direct costs by division (refine as bids come in) */
export const MACON_608_DIVISION_ESTIMATES: Record<string, number> = {
  "DIV-01": 23562,
  "DIV-03": 17904,
  "DIV-06": 23695,
  "DIV-07": 28824,
  "DIV-08": 10578,
  "DIV-09": 19317,
  "DIV-10": 661,
  "DIV-11": 1185,
  "DIV-12": 5773,
  "DIV-22": 16662,
  "DIV-23": 11001,
  "DIV-26": 18411,
  "DIV-31": 6281,
  "DIV-32": 6348,
  "DIV-33": 9676,
};

export const MACON_608_ESTIMATE_META = {
  heatedSquareFeet: 1425,
  /** Direct costs before contingency/overhead — full budget ~$214k with markup */
  directCostTotal: 199879,
  contingencyRate: 0.05,
  overheadRate: 0.08,
  donationCredit: 12000,
  fullBudgetTotal: 214663,
  source: "Booker + Vick permit set A2.2 (May 2026)",
  estimateFile: "data/estimates/608-macon-habitat-estimate-corrected.xlsx",
} as const;

export function sumDivisionEstimates(amounts: Record<string, number>): number {
  return Object.values(amounts).reduce((s, n) => s + n, 0);
}
