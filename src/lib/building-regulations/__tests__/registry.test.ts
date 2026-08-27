import { describe, expect, it } from "vitest";
import { resolveJurisdiction } from "@/lib/building-regulations/registry";

describe("resolveJurisdiction", () => {
  it("matches the canonical name and key exactly", () => {
    expect(resolveJurisdiction("Augusta-Richmond County", null)?.key).toBe(
      "augusta-richmond-ga"
    );
    expect(resolveJurisdiction("augusta-richmond-ga", null)?.key).toBe(
      "augusta-richmond-ga"
    );
  });

  it("matches through aliases in either field", () => {
    // The freeform strings the live projects have actually carried.
    expect(
      resolveJurisdiction("City of Augusta, Richmond County, GA", "Augusta, GA")?.key
    ).toBe("augusta-richmond-ga");
    expect(resolveJurisdiction(null, "Augusta, Georgia")?.key).toBe("augusta-richmond-ga");
  });

  it("keeps North Augusta out of Augusta-Richmond", () => {
    // Bare "augusta" is deliberately not an alias — North Augusta is Aiken
    // County, SC, and a substring match would misfile it.
    expect(resolveJurisdiction("North Augusta, SC", null)?.key).toBe("aiken-county-sc");
  });

  it("returns null instead of silently defaulting", () => {
    // The old behavior defaulted to Augusta — one tenant's home county as
    // everyone's answer, which also hid data problems.
    expect(resolveJurisdiction(null, null)).toBeNull();
    expect(resolveJurisdiction("", "")).toBeNull();
    expect(resolveJurisdiction("Atlantis", "Underwater, GA")).toBeNull();
  });
});
