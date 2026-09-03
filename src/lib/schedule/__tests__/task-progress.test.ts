import { describe, expect, it } from "vitest";
import {
  computeMilestoneTaskProgress,
  isCountableTask,
  type TaskProgressRow,
} from "../task-progress";

const PHASE = "phase-1";
const MILESTONES = [{ id: PHASE, phase_key: "exterior" }];

function task(status: string, overrides: Partial<TaskProgressRow> = {}): TaskProgressRow {
  return { milestone_id: PHASE, phase_key: null, status, ...overrides };
}

describe("isCountableTask", () => {
  it("excludes cancelled work and keeps every other status", () => {
    expect(isCountableTask({ status: "cancelled" })).toBe(false);
    for (const status of ["todo", "in_progress", "blocked", "done"]) {
      expect(isCountableTask({ status })).toBe(true);
    }
  });
});

describe("computeMilestoneTaskProgress", () => {
  it("keeps cancelled tasks out of the denominator", () => {
    // 608 Macon's exterior phase: the garage door came out of scope, so the
    // remaining work must still be able to reach 100%.
    const progress = computeMilestoneTaskProgress(MILESTONES, [
      task("done"),
      task("done"),
      task("cancelled"),
      task("cancelled"),
    ]);

    expect(progress.get(PHASE)).toBe(100);
  });

  it("counts blocked and in-progress work as outstanding, not cancelled", () => {
    const progress = computeMilestoneTaskProgress(MILESTONES, [
      task("done"),
      task("in_progress"),
      task("blocked"),
      task("cancelled"),
    ]);

    expect(progress.get(PHASE)).toBe(33);
  });

  it("reports no progress figure when every task was cancelled", () => {
    // Nothing countable is left, so the phase falls back to its own status
    // rather than reporting a misleading 0%.
    const progress = computeMilestoneTaskProgress(MILESTONES, [
      task("cancelled"),
      task("cancelled"),
    ]);

    expect(progress.has(PHASE)).toBe(false);
  });

  it("still maps tasks onto a milestone by phase_key", () => {
    const progress = computeMilestoneTaskProgress(MILESTONES, [
      task("done", { milestone_id: null, phase_key: "exterior" }),
      task("todo", { milestone_id: null, phase_key: "exterior" }),
      task("cancelled", { milestone_id: null, phase_key: "exterior" }),
    ]);

    expect(progress.get(PHASE)).toBe(50);
  });
});
