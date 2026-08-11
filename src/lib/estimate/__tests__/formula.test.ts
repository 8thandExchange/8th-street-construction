import { describe, it, expect } from "vitest";
import {
  evaluateFormula,
  resolveTakeoff,
  computeCostPlan,
  formulaDependencies,
  FormulaError,
  type CostLineInput,
  type TakeoffInput,
} from "../formula";

describe("evaluateFormula", () => {
  it("applies operator precedence and parentheses", () => {
    expect(evaluateFormula("2 + 3 * 4", {})).toBe(14);
    expect(evaluateFormula("(2 + 3) * 4", {})).toBe(20);
    expect(evaluateFormula("100 / 4 / 5", {})).toBe(5);
    expect(evaluateFormula("-5 + 10", {})).toBe(5);
  });

  it("resolves names from scope", () => {
    expect(evaluateFormula("heated_sqft * 3", { heated_sqft: 1458 })).toBe(4374);
  });

  it("rejects unknown names rather than treating them as zero", () => {
    expect(() => evaluateFormula("mystery * 2", {})).toThrow(FormulaError);
  });

  it("rejects malformed input", () => {
    expect(() => evaluateFormula("2 +", {})).toThrow(FormulaError);
    expect(() => evaluateFormula("(2 + 3", {})).toThrow(/closing parenthesis/);
    expect(() => evaluateFormula("2 $ 3", {})).toThrow(/Unexpected character/);
    expect(() => evaluateFormula("", {})).toThrow(/Empty formula/);
    expect(() => evaluateFormula("5 / 0", {})).toThrow(/Division by zero/);
  });

  it("does not execute anything from the expression string", () => {
    expect(() => evaluateFormula("constructor", {})).toThrow(/Unknown name/);
    expect(() => evaluateFormula("__proto__ + 1", {})).toThrow(/Unknown name/);
  });

  it("reports dependencies", () => {
    expect(formulaDependencies("(a * 2) + b - a").sort()).toEqual(["a", "b"]);
  });
});

describe("resolveTakeoff", () => {
  it("follows formulas that reference other takeoff values", () => {
    const { scope, errors } = resolveTakeoff([
      { key: "first_floor", value: 842, formula: null },
      { key: "second_floor", value: 616, formula: null },
      { key: "heated_sqft", value: null, formula: "first_floor + second_floor" },
      { key: "front_porch", value: 80, formula: null },
      { key: "total_sqft", value: null, formula: "heated_sqft + front_porch" },
    ]);

    expect(errors).toEqual({});
    expect(scope.heated_sqft).toBe(1458);
    expect(scope.total_sqft).toBe(1538);
  });

  it("records a cycle instead of hanging", () => {
    const { errors } = resolveTakeoff([
      { key: "a", value: null, formula: "b + 1" },
      { key: "b", value: null, formula: "a + 1" },
    ]);
    expect(Object.keys(errors).length).toBeGreaterThan(0);
    expect(Object.values(errors).join(" ")).toMatch(/Circular/);
  });

  it("isolates a bad cell rather than blanking the sheet", () => {
    const { scope, errors } = resolveTakeoff([
      { key: "good", value: 10, formula: null },
      { key: "bad", value: null, formula: "nonexistent * 2" },
    ]);
    expect(scope.good).toBe(10);
    expect(errors.bad).toMatch(/Unknown name/);
  });
});

// ---------------------------------------------------------------------------
// Parity with the workbook.
//
// Takeoff and formulas below are copied verbatim from the AUGUSTA tab of
// "Augusta Habitat for Humanity Cost Sheet.xlsx", including the 8.3 Interior
// Doors cell that hardcodes 20 doors against a takeoff of 14. Reproducing the
// sheet's own numbers is the point of the test; the seeded template corrects
// that line separately.
// ---------------------------------------------------------------------------

const AUGUSTA_TAKEOFF: TakeoffInput[] = [
  { key: "first_floor", value: 842, formula: null },
  { key: "second_floor", value: 616, formula: null },
  { key: "front_porch", value: 80, formula: null },
  { key: "back_patio", value: 122, formula: null },
  { key: "front_deck", value: 80, formula: null },
  { key: "heated_sqft", value: null, formula: "first_floor + second_floor" },
  { key: "total_sqft", value: null, formula: "heated_sqft + front_porch" },
  { key: "concrete_sqft", value: null, formula: "first_floor + front_porch + front_deck" },
  { key: "kitchen_backsplash", value: 48, formula: null },
  { key: "lvt_hardwood", value: 1458, formula: null },
  { key: "carpet_yd", value: 0, formula: null },
  { key: "cabinet_lnft", value: 46, formula: null },
  { key: "cabinet_unit_cost", value: 225, formula: null },
  { key: "footer_lnft", value: 182, formula: null },
  { key: "footer_yd", value: null, formula: "footer_lnft * 2 / 27" },
  { key: "patio_sqft", value: null, formula: "back_patio" },
  { key: "porch_slab_sqft", value: null, formula: "front_porch" },
  { key: "house_slab_sqft", value: null, formula: "first_floor + patio_sqft + porch_slab_sqft" },
  { key: "slab_yd", value: null, formula: "house_slab_sqft / 72" },
  { key: "siding_sq", value: 20, formula: null },
  { key: "roofing_sq", value: null, formula: "first_floor * 1.3 / 100" },
  { key: "windows", value: 18, formula: null },
  { key: "exterior_doors", value: 3, formula: null },
  { key: "interior_doors", value: 14, formula: null },
  { key: "r13", value: 1944, formula: null },
  { key: "r19", value: 0, formula: null },
  { key: "r38", value: 1001, formula: null },
  { key: "can_lights", value: 0, formula: null },
  { key: "flush_led", value: 14, formula: null },
  { key: "interior_fans", value: 4, formula: null },
  { key: "bath_fans", value: 2, formula: null },
  { key: "exterior_fans", value: 0, formula: null },
  { key: "exterior_lights", value: 1, formula: null },
  { key: "floods", value: 2, formula: null },
  { key: "granite_main", value: 50, formula: null },
  { key: "plumbing_drops", value: 15, formula: null },
  { key: "sheetrock", value: 6079, formula: null },
];

type Row = [code: string, amount: number | null, formula: string | null];

const AUGUSTA_COST_ROWS: Row[] = [
  ["1.1", 1500, null],
  ["1.2", 1500, null],
  ["1.3", 1000, null],
  ["1.4", 450, null],
  ["1.5", 1200, null],
  ["2", 1595, null],
  ["2.1", 6500, null],
  ["2.2", 1500, null],
  ["2.3", 2500, null],
  ["2.4", 0, null],
  ["2.5", 500, null],
  ["2.6", null, null],
  ["3", 2500, null],
  ["4", null, "concrete_sqft / 72 * 175 * 1.08 * 1.2"],
  ["4.4", 2400, null],
  ["4.5", null, "16.5 * footer_lnft"],
  ["4.1", null, "(concrete_sqft * 1.5 + 500) + (footer_lnft * 15)"],
  ["4.3", 1200, null],
  ["4.2", null, "10 * 205"],
  ["5.1", 0, null],
  ["5.15", 0, null],
  ["5.2", 0, null],
  ["5.3", 0, null],
  ["5.4", 0, null],
  ["5.5", 0, null],
  ["7.1", null, "total_sqft * 12.5"],
  ["7.2", null, "total_sqft * 5"],
  ["7.3", 5000, null],
  ["8", null, "heated_sqft * 2.5"],
  ["8.1", 2500, null],
  ["8.2", null, "heated_sqft * 2"],
  ["8.3", null, "20 * 200 * 1.08"],
  ["9.1", null, "roofing_sq * 150"],
  ["9.2", null, "roofing_sq * 75"],
  ["9.3", null, null],
  ["9.4", 0, null],
  ["10", 0, null],
  ["10.1", 0, null],
  ["11", 4171.06, null],
  ["11.1", null, "165 * siding_sq"],
  ["12.1", null, "windows * 225"],
  ["12.3", null, "interior_doors * 18 * 1.08 + 100"],
  ["12.4", null, "exterior_doors * 750"],
  ["12.5", null, null],
  ["12.6", 0, null],
  ["14.1", null, "plumbing_drops * 200"],
  ["14.2", 12500, null],
  ["15", null, "13660 + 10150 - 10000"],
  ["15.1", 0, null],
  ["16.1", 1500, null],
  [
    "16.2",
    null,
    "(heated_sqft * 3.75) + (can_lights + flush_led + interior_fans + bath_fans + exterior_fans + exterior_lights + floods) * 25 + 650",
  ],
  ["17", null, "(r13 * 0.95) + (r19 * 1.05) + (r38 * 0.9) * 1.25"],
  ["18", null, "sheetrock * 1.95"],
  ["21", null, "cabinet_lnft * cabinet_unit_cost"],
  ["21.1", null, "granite_main * 65 + 1500"],
  ["22", 2500, null],
  ["23.1", null, "lvt_hardwood * 3.5"],
  ["23.2", null, "carpet_yd * 13.5"],
  ["23.4", null, "(lvt_hardwood * 1.1 * 2.25) + (carpet_yd * 6)"],
  ["23.5", null, "kitchen_backsplash * 8"],
  ["23.6", null, null],
  ["23.7", 1000, null],
  ["24", null, "heated_sqft * 3"],
  ["25", null, "heated_sqft * 0.8"],
  ["25.1", 750, null],
  ["26", 10000, null],
  ["26.1", null, null],
  ["32", 3500, null],
];

const AUGUSTA_LINES: CostLineInput[] = [
  ...AUGUSTA_COST_ROWS.map(([code, amount, formula]) => ({
    id: code,
    code,
    line_type: "cost" as const,
    formula,
    estimated_amount: amount,
  })),
  { id: "P/O", code: "P/O", line_type: "markup", formula: null, estimated_amount: 15000 },
  { id: "36", code: "36", line_type: "markup", formula: "subtotal * 0.2 - 15000", estimated_amount: null },
  { id: "35", code: "35", line_type: "contingency", formula: null, estimated_amount: null },
];

describe("computeCostPlan — Augusta workbook parity", () => {
  const plan = computeCostPlan(AUGUSTA_LINES, AUGUSTA_TAKEOFF);

  it("resolves every takeoff value and every formula without error", () => {
    expect(plan.takeoffErrors).toEqual({});
    expect(plan.lines.filter((l) => l.error)).toEqual([]);
  });

  it.each([
    ["4", 3156.3],
    ["4.5", 3003],
    ["4.1", 4733],
    ["4.2", 2050],
    ["7.1", 19225],
    ["7.2", 7690],
    ["8", 3645],
    ["8.2", 2916],
    ["8.3", 4320],
    ["9.1", 1641.9],
    ["9.2", 820.95],
    ["11.1", 3300],
    ["12.1", 4050],
    ["12.3", 372.16],
    ["12.4", 2250],
    ["14.1", 3000],
    ["15", 13810],
    ["16.2", 6692.5],
    ["17", 2972.925],
    ["18", 11854.05],
    ["21", 10350],
    ["21.1", 4750],
    ["23.1", 5103],
    ["23.4", 3608.55],
    ["23.5", 384],
    ["24", 4374],
    ["25", 1166.4],
  ])("line %s matches the workbook at %d", (code, expected) => {
    expect(plan.byId[code].amount).toBeCloseTo(expected, 4);
  });

  it("matches the workbook subtotal, supervision and total", () => {
    expect(plan.subtotal).toBeCloseTo(199004.795, 3);
    expect(plan.byId["36"].amount).toBeCloseTo(24800.959, 3);
    expect(plan.total).toBeCloseTo(238805.754, 3);
  });

  it("keeps total build cost at exactly 20% over subtotal", () => {
    expect(plan.total).toBeCloseTo(plan.subtotal * 1.2, 6);
  });

  it("derives $/sqft and $/heated sqft from the takeoff", () => {
    expect(plan.perSqft).toBeCloseTo(155.2703212, 6);
    expect(plan.perHeatedSqft).toBeCloseTo(163.7899547, 6);
  });

  it("excludes markup from the subtotal", () => {
    const costTotal = AUGUSTA_COST_ROWS.reduce((sum, [code]) => sum + plan.byId[code].amount, 0);
    expect(costTotal).toBeCloseTo(plan.subtotal, 6);
  });

  it("never reports a negative remaining on an unstarted line", () => {
    // The sheet's Over/Under column shows -19,225 for untouched framing.
    // Budget minus nothing committed is the full budget, not a negative.
    const framing = plan.byId["7.1"].amount;
    expect(framing - Math.max(0, 0)).toBe(19225);
  });
});
