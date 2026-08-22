import { describe, expect, it } from "vitest";
import {
  ownerDisplayName,
  propertyAddressLine,
  scopeMdToContractParagraph,
  todayIsoDate,
} from "../proposal-contract";

describe("scopeMdToContractParagraph", () => {
  it("strips headings and collapses the proposal into one paragraph", () => {
    expect(
      scopeMdToContractParagraph("## Build\n- Framing\n- Dry-in", "Draws monthly")
    ).toBe("Build - Framing - Dry-in Terms: Draws monthly");
  });

  it("truncates long scopes so the merge field stays a paragraph", () => {
    const long = "x".repeat(2000);
    const out = scopeMdToContractParagraph(long);
    expect(out.length).toBeLessThanOrEqual(1200);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("ownerDisplayName", () => {
  it("prefers the organization over a personal name", () => {
    expect(
      ownerDisplayName({
        first_name: "Jane",
        last_name: "Doe",
        organization_name: "Habitat for Humanity — CSRA, Inc.",
      })
    ).toBe("Habitat for Humanity — CSRA, Inc.");
  });

  it("falls back to the person, then Owner", () => {
    expect(ownerDisplayName({ first_name: "Jane", last_name: "Doe" })).toBe("Jane Doe");
    expect(ownerDisplayName(null)).toBe("Owner");
  });
});

describe("propertyAddressLine", () => {
  it("joins street and city without empty parts", () => {
    expect(
      propertyAddressLine({ street_address: "608 Macon Avenue", location: "Augusta, GA" })
    ).toBe("608 Macon Avenue, Augusta, GA");
    expect(propertyAddressLine({ street_address: null, location: "Augusta" })).toBe("Augusta");
  });
});

describe("todayIsoDate", () => {
  it("returns a date-only ISO string", () => {
    expect(todayIsoDate(new Date("2026-08-22T15:00:00.000Z"))).toBe("2026-08-22");
  });
});
