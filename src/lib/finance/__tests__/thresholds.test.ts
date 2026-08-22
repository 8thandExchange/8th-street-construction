import { describe, expect, it } from "vitest";
import {
  DEFAULT_APPROVAL_THRESHOLDS,
  parseApprovalThresholds,
  requiresThresholdConfirmation,
} from "../thresholds";

describe("parseApprovalThresholds", () => {
  it("fills defaults for missing or invalid values", () => {
    expect(parseApprovalThresholds(null)).toEqual(DEFAULT_APPROVAL_THRESHOLDS);
    expect(parseApprovalThresholds({ invoice: "nope", purchaseOrder: 5000 })).toEqual({
      invoice: DEFAULT_APPROVAL_THRESHOLDS.invoice,
      bill: DEFAULT_APPROVAL_THRESHOLDS.bill,
      purchaseOrder: 5000,
    });
  });
});

describe("requiresThresholdConfirmation", () => {
  it("blocks only when over the limit and not confirmed", () => {
    const thresholds = { invoice: 1000, bill: 1000, purchaseOrder: 1000 };
    expect(requiresThresholdConfirmation("invoice", 900, thresholds, false).blocked).toBe(false);
    expect(requiresThresholdConfirmation("invoice", 1500, thresholds, false).blocked).toBe(true);
    expect(requiresThresholdConfirmation("invoice", 1500, thresholds, true).blocked).toBe(false);
  });
});
