import { describe, expect, it } from "vitest";
import { scopeVariances } from "../scope-variance";

describe("scopeVariances", () => {
  it("keeps only material variances and sorts by magnitude", () => {
    const rows = scopeVariances([
      { templateId: "a", trade: "Framing", title: "OVE package", budget: 10000, awarded: 15000 },
      { templateId: "b", trade: "HVAC", title: "Heat pump", budget: 8000, awarded: 8200 },
      { templateId: "c", trade: "Roof", title: "Standing seam", budget: 12000, awarded: 9000 },
    ]);
    expect(rows.map((r) => r.templateId)).toEqual(["a", "c"]);
    expect(rows[0]?.variancePct).toBe(50);
    expect(rows[1]?.variancePct).toBe(-25);
  });

  it("skips lines with no budget", () => {
    expect(
      scopeVariances([{ templateId: "x", trade: "Paint", title: "Interior", budget: null, awarded: 2000 }])
    ).toEqual([]);
  });
});
