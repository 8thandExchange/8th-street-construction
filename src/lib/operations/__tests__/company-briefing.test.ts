import { describe, expect, it } from "vitest";
import { buildCompanyBriefing } from "../company-briefing";

describe("buildCompanyBriefing", () => {
  it("separates draft, open, overdue, and paid receivables", () => {
    const result = buildCompanyBriefing({
      today: "2026-08-22",
      invoices: [
        { status: "draft", total: 1000, amount_paid: 0, due_date: null },
        { status: "sent", total: 5000, amount_paid: 1250, due_date: "2026-08-20" },
        { status: "sent", total: 2000, amount_paid: 0, due_date: "2026-09-01" },
        { status: "paid", total: 4000, amount_paid: 4000, due_date: "2026-08-01" },
      ],
      vendorBills: [],
      commitments: [],
      tasks: [],
    });

    expect(result.receivables).toEqual({
      openAmount: 5750,
      openCount: 2,
      overdueAmount: 3750,
      overdueCount: 1,
      draftCount: 1,
    });
  });

  it("counts operational obligations without treating completed work as risk", () => {
    const result = buildCompanyBriefing({
      today: "2026-08-22",
      invoices: [],
      vendorBills: [
        { status: "open", amount: "900.50", due_date: "2026-08-21" },
        { status: "open", amount: 100, due_date: "2026-08-30" },
        { status: "paid", amount: 500, due_date: "2026-08-01" },
      ],
      commitments: [
        { status: "open", due_date: "2026-08-21" },
        { status: "blocked", due_date: "2026-08-30" },
        { status: "done", due_date: "2026-08-01" },
      ],
      tasks: [
        { status: "todo", due_date: "2026-08-21" },
        { status: "done", due_date: "2026-08-01" },
      ],
    });

    expect(result.payables).toEqual({
      openAmount: 1000.5,
      openCount: 2,
      overdueAmount: 900.5,
      overdueCount: 1,
    });
    expect(result.commitments).toEqual({
      openCount: 2,
      blockedCount: 1,
      overdueCount: 1,
    });
    expect(result.schedule.overdueTaskCount).toBe(1);
  });
});
