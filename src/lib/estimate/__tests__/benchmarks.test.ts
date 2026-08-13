import { describe, expect, it } from "vitest";
import {
  computeBenchmarks,
  describeBenchmark,
  type CostSnapshotRow,
} from "../benchmarks";

function row(overrides: Partial<CostSnapshotRow> = {}): CostSnapshotRow {
  return {
    project_id: "p1",
    project_title: "608 Macon",
    code: "4.2",
    trade_label: "Roofing",
    line_type: "cost",
    budget: 10000,
    actual: 11000,
    heated_square_footage: 1100,
    captured_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeBenchmarks", () => {
  it("averages actuals across jobs and tracks the latest", () => {
    const rows = [
      row({ project_id: "p1", actual: 10000, captured_at: "2026-06-01T00:00:00Z" }),
      row({
        project_id: "p2",
        project_title: "605 Eve",
        actual: 14000,
        captured_at: "2026-08-01T00:00:00Z",
      }),
    ];
    const b = computeBenchmarks(rows)["4.2"];
    expect(b.projectCount).toBe(2);
    expect(b.avgActual).toBe(12000);
    expect(b.lastActual).toBe(14000);
    expect(b.lastProject).toBe("605 Eve");
  });

  it("computes $/heated sqft only from rows that recorded sqft", () => {
    const rows = [
      row({ project_id: "p1", actual: 11000, heated_square_footage: 1100 }),
      row({ project_id: "p2", actual: 9000, heated_square_footage: null }),
    ];
    const b = computeBenchmarks(rows)["4.2"];
    expect(b.avgPerHeatedSqft).toBe(10);
  });

  it("computes average variance only where a budget existed", () => {
    const rows = [
      row({ project_id: "p1", budget: 10000, actual: 11000 }), // +10%
      row({ project_id: "p2", budget: 10000, actual: 9000 }), // -10%
      row({ project_id: "p3", budget: null, actual: 5000 }),
    ];
    const b = computeBenchmarks(rows)["4.2"];
    expect(b.avgVariancePct).toBe(0);
    expect(b.projectCount).toBe(3);
  });

  it("ignores zero-actual lines, non-cost lines, and uncoded lines", () => {
    const rows = [
      row({ actual: 0 }),
      row({ line_type: "markup", actual: 5000 }),
      row({ code: null, actual: 5000 }),
    ];
    expect(computeBenchmarks(rows)).toEqual({});
  });

  it("excludes the project being estimated from its own benchmarks", () => {
    const rows = [
      row({ project_id: "current", actual: 99999 }),
      row({ project_id: "p2", actual: 8000 }),
    ];
    const b = computeBenchmarks(rows, { excludeProjectId: "current" })["4.2"];
    expect(b.projectCount).toBe(1);
    expect(b.avgActual).toBe(8000);
  });
});

describe("describeBenchmark", () => {
  it("reads as one line with the pieces that exist", () => {
    const b = computeBenchmarks([
      row({ project_id: "p1", budget: 10000, actual: 11000 }),
      row({
        project_id: "p2",
        project_title: "605 Eve",
        budget: 10000,
        actual: 11000,
        captured_at: "2026-08-05T00:00:00Z",
      }),
    ])["4.2"];
    const text = describeBenchmark(b);
    expect(text).toContain("avg actual $11,000 across 2 jobs");
    expect(text).toContain("last $11,000 (605 Eve)");
    expect(text).toContain("$10/heated sqft");
    expect(text).toContain("+10% over budget");
  });

  it("omits variance when it's within noise", () => {
    const b = computeBenchmarks([row({ budget: 10000, actual: 10050 })])["4.2"];
    expect(describeBenchmark(b)).not.toContain("over budget");
  });
});
