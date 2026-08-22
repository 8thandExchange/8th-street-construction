import { describe, expect, it } from "vitest";
import {
  canTransitionRfi,
  canTransitionSubmittal,
  rfiNeedsClient,
  submittalNeedsReview,
} from "../review-status";

describe("RFI transitions", () => {
  it("opens a draft, answers it, then closes it", () => {
    expect(canTransitionRfi("draft", "open")).toBe(true);
    expect(canTransitionRfi("open", "answered")).toBe(true);
    expect(canTransitionRfi("answered", "closed")).toBe(true);
    expect(canTransitionRfi("closed", "open")).toBe(false);
  });

  it("flags open RFIs as waiting on the client", () => {
    expect(rfiNeedsClient("open")).toBe(true);
    expect(rfiNeedsClient("answered")).toBe(false);
  });
});

describe("submittal transitions", () => {
  it("reviews a submitted package to a decision", () => {
    expect(canTransitionSubmittal("submitted", "in_review")).toBe(true);
    expect(canTransitionSubmittal("in_review", "approved_as_noted")).toBe(true);
    expect(canTransitionSubmittal("approved", "rejected")).toBe(false);
    expect(submittalNeedsReview("submitted")).toBe(true);
  });
});
