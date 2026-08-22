import { describe, expect, it } from "vitest";
import { forecastJobCost, marginAtCompletion } from "../margin-at-completion";

describe("marginAtCompletion", () => {
  it("uses budget when spend is under plan", () => {
    const mac = marginAtCompletion({
      projectId: "p1",
      title: "608 Macon",
      contract: 239665,
      revisedBudget: 200000,
      spent: 80000,
    });
    expect(forecastJobCost(200000, 80000)).toBe(200000);
    expect(mac.marginAtCompletion).toBe(39665);
    expect(mac.reason).toMatch(/On or under budget/);
  });

  it("uses spend when the job is already over budget", () => {
    const mac = marginAtCompletion({
      projectId: "p1",
      title: "608 Macon",
      contract: 239665,
      revisedBudget: 200000,
      spent: 210000,
    });
    expect(mac.forecastCost).toBe(210000);
    expect(mac.marginAtCompletion).toBe(29665);
    expect(mac.reason).toMatch(/exceeds the revised budget/);
  });
});
