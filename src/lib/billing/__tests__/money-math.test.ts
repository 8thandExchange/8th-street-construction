import { describe, expect, it } from "vitest";
import { allocateDrawAmounts } from "../draws";
import { computeBillingSummary, getBillingSetupStep } from "../summary";
import {
  formatMoney,
  getDrawTemplateForProject,
  HABITAT_DRAW_TEMPLATE,
  LUXURY_DRAW_TEMPLATE,
} from "../constants";

describe("allocateDrawAmounts", () => {
  it("sums exactly to the contract on the 608 Macon contract value", () => {
    const draws = allocateDrawAmounts(239_665, HABITAT_DRAW_TEMPLATE);
    const total = draws.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(239_665);
  });

  it("absorbs rounding drift into the final draw", () => {
    // 1001 with 15/25/20/15/25 rounds to 1000 draw-by-draw — the old bug.
    const draws = allocateDrawAmounts(1001, HABITAT_DRAW_TEMPLATE);
    const total = draws.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(1001);
  });

  it("sums exactly for every contract value in a brute-force sweep", () => {
    for (let contract = 1; contract <= 5000; contract++) {
      for (const template of [HABITAT_DRAW_TEMPLATE, LUXURY_DRAW_TEMPLATE]) {
        const total = allocateDrawAmounts(contract, template).reduce(
          (s, d) => s + d.amount,
          0
        );
        if (total !== contract) {
          throw new Error(`drift at contract=${contract}: got ${total}`);
        }
      }
    }
  });

  it("preserves draw order and percents", () => {
    const draws = allocateDrawAmounts(100_000, LUXURY_DRAW_TEMPLATE);
    expect(draws.map((d) => d.draw_number)).toEqual([1, 2, 3, 4, 5]);
    expect(draws.map((d) => d.percent)).toEqual(
      LUXURY_DRAW_TEMPLATE.map((d) => d.percent)
    );
  });

  it("handles zero, negative, and empty inputs safely", () => {
    expect(allocateDrawAmounts(0, HABITAT_DRAW_TEMPLATE).reduce((s, d) => s + d.amount, 0)).toBe(0);
    expect(allocateDrawAmounts(100_000, [])).toEqual([]);
    expect(allocateDrawAmounts(NaN, HABITAT_DRAW_TEMPLATE).reduce((s, d) => s + d.amount, 0)).toBe(0);
  });
});

describe("draw templates", () => {
  it("percents sum to exactly 100", () => {
    expect(HABITAT_DRAW_TEMPLATE.reduce((s, d) => s + d.percent, 0)).toBe(100);
    expect(LUXURY_DRAW_TEMPLATE.reduce((s, d) => s + d.percent, 0)).toBe(100);
  });

  it("routes Habitat projects to the Habitat template", () => {
    expect(getDrawTemplateForProject({ funding_type: "habitat" })).toBe(HABITAT_DRAW_TEMPLATE);
    expect(getDrawTemplateForProject({ funding_type: "hud_home" })).toBe(HABITAT_DRAW_TEMPLATE);
    expect(getDrawTemplateForProject("608-macon-ave")).toBe(HABITAT_DRAW_TEMPLATE);
    expect(getDrawTemplateForProject({ funding_type: "private" })).toBe(LUXURY_DRAW_TEMPLATE);
  });
});

describe("computeBillingSummary", () => {
  const draws = [
    { amount: 35_950, status: "paid" },
    { amount: 35_950, status: "invoiced" },
    { amount: 47_933, status: "scheduled" },
  ];

  it("computes invoiced, paid, balance, and remaining", () => {
    const s = computeBillingSummary(239_665, 0, draws);
    expect(s.paid).toBe(35_950);
    expect(s.invoiced).toBe(71_900); // paid counts as invoiced
    expect(s.balance).toBe(239_665 - 35_950);
    expect(s.remaining).toBe(239_665 - 71_900);
    expect(s.drawsComplete).toBe(1);
    expect(s.drawCount).toBe(3);
  });

  it("folds change orders into the revised contract", () => {
    const s = computeBillingSummary(239_665, 10_000, draws);
    expect(s.revisedContract).toBe(249_665);
    expect(s.balance).toBe(249_665 - 35_950);
  });

  it("caps paidPct at 100 and never divides by zero", () => {
    const over = computeBillingSummary(100, 0, [{ amount: 500, status: "paid" }]);
    expect(over.paidPct).toBe(100);
    expect(over.balance).toBe(0); // clamped, never negative
    const zero = computeBillingSummary(0, 0, []);
    expect(zero.paidPct).toBe(0);
  });
});

describe("getBillingSetupStep", () => {
  it("walks contract -> draws -> done", () => {
    expect(getBillingSetupStep(0, 0)).toBe(1);
    expect(getBillingSetupStep(239_665, 0)).toBe(2);
    expect(getBillingSetupStep(239_665, 5)).toBe("done");
  });
});

describe("formatMoney", () => {
  it("formats whole dollars, no cents", () => {
    expect(formatMoney(239_665)).toBe("$239,665");
    expect(formatMoney(0)).toBe("$0");
  });
});
