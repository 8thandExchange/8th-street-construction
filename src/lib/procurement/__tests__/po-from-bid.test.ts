import { describe, expect, it } from "vitest";
import { poBillCoverage, purchaseOrderLineFromAwardedBid } from "../po-from-bid";

describe("purchaseOrderLineFromAwardedBid", () => {
  it("carries the estimate line so committed cost updates", () => {
    expect(
      purchaseOrderLineFromAwardedBid({
        title: "Framing package",
        trade: "Framing",
        amount: 18500,
        divisionCode: "06",
        estimateLineId: "line-1",
      })
    ).toEqual({
      description: "Framing package (Framing) — per awarded bid",
      quantity: 1,
      unit_amount: 18500,
      cost_division: "06",
      estimate_line_id: "line-1",
    });
  });

  it("rejects a missing amount", () => {
    expect(() =>
      purchaseOrderLineFromAwardedBid({ title: "Framing", amount: 0 })
    ).toThrow(/positive amount/);
  });
});

describe("poBillCoverage", () => {
  it("shows remaining coverage and overage", () => {
    expect(poBillCoverage(10000, [4000, 2500])).toEqual({
      committed: 10000,
      billed: 6500,
      remaining: 3500,
      over: 0,
    });
    expect(poBillCoverage(10000, [12000])).toEqual({
      committed: 10000,
      billed: 12000,
      remaining: 0,
      over: 2000,
    });
  });
});
