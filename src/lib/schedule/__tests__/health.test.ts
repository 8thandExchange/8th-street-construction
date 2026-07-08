import { describe, expect, it } from "vitest";
import { computeScheduleHealth } from "../health";
import { resolveMilestoneDates } from "../gantt-dates";
import type { GanttMilestone } from "../gantt";

const TODAY = new Date("2026-07-08T12:00:00");

function phase(overrides: Partial<GanttMilestone> & { id: string }): GanttMilestone {
  return { title: overrides.id, status: "pending", ...overrides };
}

describe("resolveMilestoneDates (client mode)", () => {
  it("spans scheduled_start to target_date so clients get duration bars", () => {
    const { start, end } = resolveMilestoneDates(
      phase({ id: "a", scheduled_start: "2026-07-01", target_date: "2026-07-20" }),
      "client"
    );
    expect(start?.getDate()).toBe(1);
    expect(end?.getDate()).toBe(20);
  });

  it("never reveals a start after the committed target", () => {
    const { start, end } = resolveMilestoneDates(
      phase({ id: "a", scheduled_start: "2026-08-01", target_date: "2026-07-20" }),
      "client"
    );
    expect(start?.getTime()).toBe(end?.getTime());
  });

  it("falls back to target_date alone", () => {
    const { start, end } = resolveMilestoneDates(
      phase({ id: "a", target_date: "2026-07-20" }),
      "client"
    );
    expect(start?.getTime()).toBe(end?.getTime());
  });
});

describe("computeScheduleHealth", () => {
  it("reports on_track when nothing is late or blocked", () => {
    const health = computeScheduleHealth(
      [
        phase({ id: "a", status: "completed", target_date: "2026-06-15" }),
        phase({
          id: "b",
          status: "in_progress",
          scheduled_start: "2026-07-01",
          target_date: "2026-07-20",
        }),
      ],
      { today: new Date(TODAY) }
    );
    expect(health.state).toBe("on_track");
    expect(health.current?.id).toBe("b");
    expect(health.latePhases).toHaveLength(0);
  });

  it("flags a slightly late phase as watch and a very late one as behind", () => {
    const watch = computeScheduleHealth(
      [phase({ id: "a", status: "in_progress", target_date: "2026-07-06" })],
      { today: new Date(TODAY) }
    );
    expect(watch.state).toBe("watch");
    expect(watch.latePhases[0].daysLate).toBe(2);

    const behind = computeScheduleHealth(
      [phase({ id: "a", status: "in_progress", target_date: "2026-06-20" })],
      { today: new Date(TODAY) }
    );
    expect(behind.state).toBe("behind");
    expect(behind.worstDaysLate).toBeGreaterThanOrEqual(5);
  });

  it("does not count completed phases as late", () => {
    const health = computeScheduleHealth(
      [phase({ id: "a", status: "completed", target_date: "2026-06-01" })],
      { today: new Date(TODAY) }
    );
    expect(health.state).toBe("complete");
    expect(health.latePhases).toHaveLength(0);
  });

  it("treats blocked phases as needing attention", () => {
    const health = computeScheduleHealth(
      [phase({ id: "a", status: "blocked", target_date: "2026-08-01" })],
      { today: new Date(TODAY) }
    );
    expect(health.state).toBe("watch");
    expect(health.blockedCount).toBe(1);
  });

  it("surfaces the next upcoming phase", () => {
    const health = computeScheduleHealth(
      [
        phase({ id: "a", status: "in_progress", target_date: "2026-07-15" }),
        phase({
          id: "b",
          status: "pending",
          scheduled_start: "2026-07-16",
          target_date: "2026-07-30",
        }),
      ],
      { today: new Date(TODAY) }
    );
    expect(health.nextUp?.id).toBe("b");
    expect(health.nextUp?.daysUntil).toBe(8);
  });

  it("reports unscheduled when no phase has any date", () => {
    const health = computeScheduleHealth([phase({ id: "a" }), phase({ id: "b" })], {
      today: new Date(TODAY),
    });
    expect(health.state).toBe("unscheduled");
  });
});
