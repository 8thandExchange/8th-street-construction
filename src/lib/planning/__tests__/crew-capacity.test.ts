import { describe, expect, it } from "vitest";
import {
  actualCrewFromLogs,
  addDays,
  crewWeekStatus,
  currentPhaseTitle,
  formatWeekLabel,
  isoWeekStart,
  parseCrewCount,
  personDisplayName,
  resolvePlannedCrew,
  summarizeCrewBoard,
  weekEnd,
} from "../crew-capacity";

describe("isoWeekStart", () => {
  it("aligns Sunday and midweek dates to Monday", () => {
    expect(isoWeekStart("2026-08-22")).toBe("2026-08-17");
    expect(isoWeekStart("2026-08-17")).toBe("2026-08-17");
    expect(isoWeekStart("2026-08-16")).toBe("2026-08-10");
  });

  it("returns a Saturday week-end six days later", () => {
    expect(weekEnd("2026-08-17")).toBe("2026-08-23");
    expect(addDays("2026-08-17", 1)).toBe("2026-08-18");
  });
});

describe("formatWeekLabel", () => {
  it("uses a single month when the week stays inside it", () => {
    expect(formatWeekLabel("2026-08-17")).toBe("Aug 17–23");
  });

  it("names both months when a week crosses them", () => {
    expect(formatWeekLabel("2026-08-31")).toBe("Aug 31–Sep 6");
  });
});

describe("planned vs logged", () => {
  it("prefers the week plan over the job default", () => {
    expect(resolvePlannedCrew(4, 2)).toBe(4);
    expect(resolvePlannedCrew(null, 3)).toBe(3);
    expect(resolvePlannedCrew(null, null)).toBeNull();
  });

  it("takes the week's max logged crew and ignores empty days", () => {
    expect(actualCrewFromLogs([2, null, 4, 3])).toEqual({ max: 4, daysLogged: 3, avg: 3 });
    expect(actualCrewFromLogs([null, undefined])).toEqual({ max: null, daysLogged: 0, avg: null });
  });

  it("flags over, under, unplanned, and missing logs", () => {
    expect(crewWeekStatus(null, 3)).toBe("unplanned");
    expect(crewWeekStatus(4, null)).toBe("no_log");
    expect(crewWeekStatus(4, 6)).toBe("over");
    expect(crewWeekStatus(4, 2)).toBe("under");
    expect(crewWeekStatus(4, 4)).toBe("on_plan");
  });

  it("rejects negative crew counts", () => {
    expect(parseCrewCount(-1)).toBeNull();
    expect(parseCrewCount("3")).toBe(3);
    expect(parseCrewCount("")).toBeNull();
  });
});

describe("summarizeCrewBoard", () => {
  it("totals planned people and exception counts", () => {
    const summary = summarizeCrewBoard([
      { status: "over", planned: 4 },
      { status: "unplanned", planned: null },
      { status: "no_log", planned: 3 },
      { status: "on_plan", planned: 2 },
    ]);
    expect(summary).toEqual({
      jobs: 4,
      planned: 9,
      unplanned: 1,
      over: 1,
      under: 0,
      noLog: 1,
      onPlan: 1,
    });
  });
});

describe("display helpers", () => {
  it("prefers an in-progress milestone, then the next pending one", () => {
    expect(
      currentPhaseTitle([
        { title: "Slab", status: "completed" },
        { title: "Framing", status: "in_progress" },
        { title: "Roof", status: "pending" },
      ])
    ).toBe("Framing");
    expect(
      currentPhaseTitle([
        { title: "Slab", status: "completed" },
        { title: "Framing", status: "pending" },
      ])
    ).toBe("Framing");
  });

  it("uses a person's name, then email", () => {
    expect(personDisplayName({ first_name: "Troy", last_name: "Akers" })).toBe("Troy Akers");
    expect(personDisplayName({ first_name: null, last_name: null, email: "troy@x.com" })).toBe(
      "troy@x.com"
    );
    expect(personDisplayName(null)).toBeNull();
  });
});
