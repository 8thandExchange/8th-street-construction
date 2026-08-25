import { describe, expect, it } from "vitest";
import {
  assertClearedToInvoice,
  hasNoticeToProceed,
  noticeToProceedBlock,
  requiresNoticeToProceed,
} from "../funding";

describe("notice to proceed", () => {
  it("does not apply to privately funded jobs", () => {
    const project = { funding_type: "private", slug: "some-custom-home" };
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

  // 608 Macon predates the funding_type column being set reliably, and
  // isHabitatProject still recognises it by slug. The gate has to agree.
  it("recognises 608 Macon by slug even without a funding type", () => {
    const project = { slug: "608-macon-ave", notice_to_proceed_at: null };
    expect(requiresNoticeToProceed(project)).toBe(true);
    expect(() => assertClearedToInvoice(project)).toThrow();
  });

  it("treats an empty date string as no notice", () => {
    const project = { funding_type: "hud_home", notice_to_proceed_at: "" };
    expect(hasNoticeToProceed(project)).toBe(false);
    expect(() => assertClearedToInvoice(project)).toThrow();
  });
});
