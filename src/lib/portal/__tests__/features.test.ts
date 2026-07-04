import { describe, expect, it } from "vitest";
import { enabledFeatureKeys, isFeatureEnabled, PORTAL_FEATURES } from "../features";

describe("isFeatureEnabled", () => {
  it("defaults everything ON for empty/null/legacy values", () => {
    for (const v of [null, undefined, {}, "junk", []]) {
      expect(isFeatureEnabled(v, "selections")).toBe(true);
      expect(isFeatureEnabled(v, "billing")).toBe(true);
    }
  });

  it("only an explicit false disables a feature", () => {
    const features = { selections: false, photos: true };
    expect(isFeatureEnabled(features, "selections")).toBe(false);
    expect(isFeatureEnabled(features, "photos")).toBe(true);
    expect(isFeatureEnabled(features, "billing")).toBe(true); // absent = on
  });

  it("enabledFeatureKeys filters correctly", () => {
    const keys = enabledFeatureKeys({ punch_list: false, daily_logs: false });
    expect(keys).not.toContain("punch_list");
    expect(keys).not.toContain("daily_logs");
    expect(keys).toHaveLength(PORTAL_FEATURES.length - 2);
  });
});
