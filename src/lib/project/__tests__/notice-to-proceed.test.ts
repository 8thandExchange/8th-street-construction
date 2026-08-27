import { describe, expect, it } from "vitest";
import {
  assertClearedToInvoice,
  hasNoticeToProceed,
  noticeToProceedBlock,
  requiresNoticeToProceed,
} from "../funding";

describe("notice to proceed", () => {
  it("does not apply to privately funded jobs", () => {
    const project = { funding_type: "private" };
    expect(requiresNoticeToProceed(project)).toBe(false);
    expect(noticeToProceedBlock(project)).toBeNull();
    expect(() => assertClearedToInvoice(project)).not.toThrow();
  });

  it("blocks a HUD HOME job with no notice on file", () => {
    const project = { funding_type: "hud_home", notice_to_proceed_at: null };
    expect(requiresNoticeToProceed(project)).toBe(true);
    expect(hasNoticeToProceed(project)).toBe(false);
    expect(noticeToProceedBlock(project)).toMatch(/notice to proceed/i);
    expect(() => assertClearedToInvoice(project)).toThrow(/notice to proceed/i);
  });

  it("blocks a Habitat partner job with no notice on file", () => {
    const project = { funding_type: "habitat", notice_to_proceed_at: null };
    expect(noticeToProceedBlock(project)).toMatch(/Habitat/);
    expect(() => assertClearedToInvoice(project)).toThrow();
  });

  it("releases the job once the notice is recorded", () => {
    const project = { funding_type: "hud_home", notice_to_proceed_at: "2026-08-25" };
    expect(hasNoticeToProceed(project)).toBe(true);
    expect(noticeToProceedBlock(project)).toBeNull();
    expect(() => assertClearedToInvoice(project)).not.toThrow();
  });

  // The slug fallback for 608 Macon is gone: funding_type is set on every
  // live job and is the only thing that gates. A job with no funding type
  // is private by definition — slug spelling never re-arms the gate.
  it("gates on funding_type alone — no slug recognition", () => {
    const project = { notice_to_proceed_at: null };
    expect(requiresNoticeToProceed(project)).toBe(false);
    expect(() => assertClearedToInvoice(project)).not.toThrow();
  });

  it("treats an empty date string as no notice", () => {
    const project = { funding_type: "hud_home", notice_to_proceed_at: "" };
    expect(hasNoticeToProceed(project)).toBe(false);
    expect(() => assertClearedToInvoice(project)).toThrow();
  });
});
