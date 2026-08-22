import { describe, expect, it } from "vitest";
import { canCloseMonth, collectMonthCloseExceptions } from "../month-close";

describe("collectMonthCloseExceptions", () => {
  it("treats unpaid and overdue bills as blockers", () => {
    const exceptions = collectMonthCloseExceptions({
      month: "2026-08",
      invoices: [{ id: "i1", status: "sent", due_date: "2026-08-10", projectId: "p1" }],
      bills: [{ id: "b1", status: "open", due_date: "2026-07-31", allocated: false }],
      purchaseOrders: [{ id: "po1", status: "issued", acknowledged_at: null, projectId: "p1" }],
      contracts: [{ id: "c1", status: "out_for_signature" }],
    });
    expect(exceptions.some((e) => e.id === "open-inv-i1" && e.severity === "critical")).toBe(true);
    expect(exceptions.some((e) => e.id === "open-bill-b1")).toBe(true);
    expect(canCloseMonth(exceptions)).toBe(false);
  });

  it("allows close when only warnings remain", () => {
    const exceptions = collectMonthCloseExceptions({
      month: "2026-08",
      invoices: [{ id: "i1", status: "paid", due_date: "2026-08-10" }],
      bills: [{ id: "b1", status: "paid", due_date: "2026-08-01", allocated: false }],
      purchaseOrders: [],
      contracts: [],
    });
    expect(canCloseMonth(exceptions)).toBe(true);
    expect(exceptions.some((e) => e.id === "uncoded-bill-b1")).toBe(true);
  });
});
