import { describe, expect, it } from "vitest";
import { groupNudges, selectNudges } from "../nudges";
import type { ActionItemRow } from "../types";

const TODAY = new Date("2026-08-06T09:00:00Z");

function item(overrides: Partial<ActionItemRow> = {}): ActionItemRow {
  return {
    id: "a1",
    meeting_id: "m1",
    agenda_item_id: null,
    title: "Come back with volunteer dates",
    detail: null,
    owner_profile_id: "p-robby",
    owner_name: "Robby",
    owner_email: "robby@8thstreetconstruction.com",
    owner_org: "8th Street Construction",
    is_external: false,
    due_date: null,
    status: "open",
    priority: "normal",
    project_id: null,
    project_task_id: null,
    source: "meeting",
    nudge_enabled: true,
    last_nudge_at: null,
    nudge_count: 0,
    completed_at: null,
    created_at: "2026-08-01T12:00:00Z",
    updated_at: "2026-08-01T12:00:00Z",
    ...overrides,
  };
}

describe("selectNudges", () => {
  it("flags overdue, due-today, and imminent items", () => {
    const result = selectNudges({
      items: [
        item({ id: "overdue", due_date: "2026-08-03" }),
        item({ id: "today", due_date: "2026-08-06" }),
        item({ id: "soon", due_date: "2026-08-08" }),
      ],
      lastUpdateAt: {},
      today: TODAY,
    });

    expect(result.map((r) => [r.item.id, r.tier])).toEqual([
      ["overdue", "overdue"],
      ["today", "due"],
      ["soon", "upcoming"],
    ]);
  });

  it("leaves items alone when the due date is comfortably out", () => {
    const result = selectNudges({
      items: [item({ due_date: "2026-08-20" })],
      lastUpdateAt: {},
      today: TODAY,
    });
    expect(result).toEqual([]);
  });

  it("chases undated items only once they have gone quiet", () => {
    const fresh = selectNudges({
      items: [item({ id: "fresh", updated_at: "2026-08-05T12:00:00Z" })],
      lastUpdateAt: {},
      today: TODAY,
    });
    expect(fresh).toEqual([]);

    const quiet = selectNudges({
      items: [item({ id: "quiet", updated_at: "2026-07-20T12:00:00Z" })],
      lastUpdateAt: {},
      today: TODAY,
    });
    expect(quiet.map((r) => r.tier)).toEqual(["stale"]);
  });

  it("counts a recent update as movement, so the item goes quiet again", () => {
    const result = selectNudges({
      items: [item({ id: "updated", updated_at: "2026-07-20T12:00:00Z" })],
      lastUpdateAt: { updated: "2026-08-05T12:00:00Z" },
      today: TODAY,
    });
    expect(result).toEqual([]);
  });

  it("respects the per-tier cooldown so nobody gets asked daily", () => {
    const justAsked = selectNudges({
      items: [item({ due_date: "2026-08-03", last_nudge_at: "2026-08-05T12:00:00Z" })],
      lastUpdateAt: {},
      today: TODAY,
    });
    expect(justAsked).toEqual([]);

    const askedAWhileAgo = selectNudges({
      items: [item({ due_date: "2026-08-03", last_nudge_at: "2026-08-01T12:00:00Z" })],
      lastUpdateAt: {},
      today: TODAY,
    });
    expect(askedAWhileAgo).toHaveLength(1);
  });

  it("skips closed items and items with nudging switched off", () => {
    const result = selectNudges({
      items: [
        item({ id: "done", status: "done", due_date: "2026-08-01" }),
        item({ id: "muted", nudge_enabled: false, due_date: "2026-08-01" }),
      ],
      lastUpdateAt: {},
      today: TODAY,
    });
    expect(result).toEqual([]);
  });
});

describe("groupNudges", () => {
  const internal = {
    "p-robby": { email: "robby@8thstreetconstruction.com", name: "Robby" },
  };
  const admins = [
    { email: "robby@8thstreetconstruction.com", name: "Robby" },
    { email: "troy.w.akers@gmail.com", name: "Troy Akers" },
  ];

  it("sends an owner their own items", () => {
    const groups = groupNudges(
      selectNudges({
        items: [item({ due_date: "2026-08-03" })],
        lastUpdateAt: {},
        today: TODAY,
      }),
      internal,
      admins
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].recipient).toBe("robby@8thstreetconstruction.com");
    expect(groups[0].owned).toHaveLength(1);
    expect(groups[0].waitingOn).toHaveLength(0);
  });

  it("never emails an outside owner — admins are told they are waiting on them", () => {
    const external = item({
      id: "mckenzie",
      owner_profile_id: null,
      owner_name: "McKenzie Beech",
      owner_email: "mbeech@augustahabitat.org",
      is_external: true,
      due_date: "2026-08-03",
    });

    const groups = groupNudges(
      selectNudges({ items: [external], lastUpdateAt: {}, today: TODAY }),
      internal,
      admins
    );

    const recipients = groups.map((g) => g.recipient).sort();
    expect(recipients).toEqual([
      "robby@8thstreetconstruction.com",
      "troy.w.akers@gmail.com",
    ]);
    expect(recipients).not.toContain("mbeech@augustahabitat.org");
    for (const g of groups) {
      expect(g.owned).toHaveLength(0);
      expect(g.waitingOn).toHaveLength(1);
    }
  });
});
