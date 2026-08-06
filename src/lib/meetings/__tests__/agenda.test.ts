import { describe, expect, it } from "vitest";
import { buildNextAgenda } from "../agenda";
import type { ActionItemRow, AgendaItemRow } from "../types";

/** Robby's proposed standing agenda, as seeded for the board series. */
const BOARD_TEMPLATE = [
  { number: "1", title: "Confirm previous minutes" },
  { number: "2", title: "Matters arising" },
  { number: "3", title: "Progress reports" },
  { number: "4", title: "Cashflow" },
  { number: "5", title: "New/pending business/jobs" },
  { number: "6", title: "Matters arising" },
  { number: "7", title: "General" },
];

const TODAY = new Date("2026-08-06T09:00:00Z");

function action(overrides: Partial<ActionItemRow> = {}) {
  return {
    id: "a1",
    title: "Come back with volunteer dates",
    owner_name: "Robby",
    owner_email: null,
    due_date: "2026-08-03",
    status: "open" as const,
    is_external: false,
    ...overrides,
  };
}

function carried(overrides: Partial<AgendaItemRow> = {}) {
  return {
    id: "c1",
    number: "5",
    title: "MOU with Habitat",
    notes_md: null,
    status: "carried",
    ...overrides,
  };
}

describe("buildNextAgenda", () => {
  it("keeps the template's running order and numbering", () => {
    const agenda = buildNextAgenda({
      template: BOARD_TEMPLATE,
      carriedItems: [],
      openActions: [],
      projects: [],
      today: TODAY,
    });

    expect(agenda.map((a) => a.number)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(agenda[3].title).toBe("Cashflow");
  });

  it("folds unfinished business and open actions into the first Matters Arising", () => {
    const agenda = buildNextAgenda({
      template: BOARD_TEMPLATE,
      carriedItems: [carried()],
      openActions: [action(), action({ id: "a2", title: "Best week for groundbreaking" })],
      projects: [],
      today: TODAY,
    });

    const first = agenda.find((a) => a.number === "2")!;
    expect(first.notes_md).toContain("MOU with Habitat");
    expect(first.notes_md).toContain("Come back with volunteer dates");
    expect(first.notes_md).toContain("3 days overdue");
    expect(first.action_item_ids).toEqual(["a1", "a2"]);

    // The second Matters Arising stays empty for whatever comes up in the room.
    const second = agenda.find((a) => a.number === "6")!;
    expect(second.notes_md).toBeNull();
  });

  it("says so plainly when nothing is outstanding", () => {
    const agenda = buildNextAgenda({
      template: BOARD_TEMPLATE,
      carriedItems: [],
      openActions: [],
      projects: [],
      today: TODAY,
    });
    expect(agenda.find((a) => a.number === "2")!.notes_md).toBe("Nothing outstanding.");
  });

  it("ignores items that are already closed", () => {
    const agenda = buildNextAgenda({
      template: BOARD_TEMPLATE,
      carriedItems: [],
      openActions: [action({ status: "done" })],
      projects: [],
      today: TODAY,
    });
    expect(agenda.find((a) => a.number === "2")!.notes_md).toBe("Nothing outstanding.");
  });

  it("gives every live job its own numbered progress line", () => {
    const agenda = buildNextAgenda({
      template: BOARD_TEMPLATE,
      carriedItems: [],
      openActions: [],
      projects: [
        { id: "p1", title: "608 Macon Ave" },
        { id: "p2", title: "1137 Merry St" },
      ],
      today: TODAY,
    });

    const progress = agenda.filter((a) => a.number.startsWith("3."));
    expect(progress.map((p) => [p.number, p.title])).toEqual([
      ["3.1", "608 Macon Ave"],
      ["3.2", "1137 Merry St"],
    ]);
  });

  it("notes whether the previous minutes still need confirming", () => {
    const agenda = buildNextAgenda({
      template: BOARD_TEMPLATE,
      carriedItems: [],
      openActions: [],
      projects: [],
      previousMeeting: { id: "m1", meeting_date: "2026-07-02", status: "draft_minutes" },
      today: TODAY,
    });

    expect(agenda[0].notes_md).toContain("July 2, 2026");
    expect(agenda[0].notes_md).toContain("for confirmation");
  });
});
