import { describe, expect, it } from "vitest";
import {
  aggregateJobCosts,
  aggregateTradeCosts,
  type JobCostProject,
  type JobCostRollupRow,
} from "../job-cost";

function row(overrides: Partial<JobCostRollupRow> = {}): JobCostRollupRow {
  return {
    project_id: "p1",
    section: "Shell",
    line_type: "cost",
    budget: 10000,
    committed: 0,
    actual: 0,
    billed: 0,
    co_approved: 0,
    revised_budget: 10000,
    ...overrides,
  };
}

const PROJECTS: JobCostProject[] = [
  { id: "p1", title: "608 Macon", status: "active", contract_value: 250000, heated_square_footage: 1425 },
  { id: "p2", title: "605 Eve", status: "active", contract_value: null, heated_square_footage: null },
];

describe("aggregateJobCosts", () => {
  it("sums per project and measures spend as max(committed, actual)", () => {
    const rows = [
      row({ committed: 8000, actual: 6000 }),
      row({ budget: 5000, revised_budget: 5000, committed: 0, actual: 2000 }),
    ];
    const [job] = aggregateJobCosts(PROJECTS, rows);
    expect(job.title).toBe("608 Macon");
    expect(job.revisedBudget).toBe(15000);
    // Per-line max, summed: max(8000,6000) + max(0,2000)... spent is
    // computed at project level: max(sum committed, sum actual).
    expect(job.spent).toBe(Math.max(8000, 8000));
    expect(job.remaining).toBe(15000 - 8000);
    expect(job.marginAtBudget).toBe(250000 - 15000);
    expect(job.spentPerHeatedSqft).toBe(Math.round((8000 / 1425) * 100) / 100);
  });

  it("folds approved change orders into the revised budget", () => {
    const rows = [row({ budget: 10000, co_approved: 2500, revised_budget: 12500 })];
    const [job] = aggregateJobCosts(PROJECTS, rows);
    expect(job.revisedBudget).toBe(12500);
    expect(job.coApproved).toBe(2500);
    expect(job.marginAtBudget).toBe(250000 - 12500);
  });

  it("skips projects without cost lines and null contracts stay null", () => {
    const rows = [row({ project_id: "p2", actual: 1000 })];
    const jobs = aggregateJobCosts(PROJECTS, rows);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("605 Eve");
    expect(jobs[0].marginAtBudget).toBeNull();
    expect(jobs[0].spentPerHeatedSqft).toBeNull();
  });

  it("ignores markup lines", () => {
    const rows = [row(), row({ line_type: "markup", budget: 99999, revised_budget: 99999 })];
    const [job] = aggregateJobCosts(PROJECTS, rows);
    expect(job.revisedBudget).toBe(10000);
  });
});

describe("aggregateTradeCosts", () => {
  it("aggregates only lines with real spend, worst overruns first", () => {
    const rows = [
      row({ section: "Shell", budget: 10000, revised_budget: 10000, actual: 13000 }), // +30%
      row({ project_id: "p2", section: "Shell", budget: 10000, revised_budget: 10000, actual: 11000 }),
      row({ section: "Finishes", budget: 8000, revised_budget: 8000, actual: 8000 }), // 0%
      row({ section: "Sitework", actual: 0 }), // no spend — excluded
    ];
    const trades = aggregateTradeCosts(rows);
    expect(trades.map((t) => t.section)).toEqual(["Shell", "Finishes"]);
    expect(trades[0].projectCount).toBe(2);
    expect(trades[0].variancePct).toBe(0.2);
    expect(trades[1].variancePct).toBe(0);
  });
});
