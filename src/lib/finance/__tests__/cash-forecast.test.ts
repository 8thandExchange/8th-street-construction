import { describe, expect, it } from "vitest";
import { bucketCashWeeks, collectCashItems, invoiceBalance } from "../cash-forecast";

describe("invoiceBalance", () => {
  it("never goes negative", () => {
    expect(invoiceBalance(1000, 250)).toBe(750);
    expect(invoiceBalance(1000, 1200)).toBe(0);
  });
});

describe("collectCashItems", () => {
  it("keeps open invoices, scheduled draws, open bills, and issued POs", () => {
    const items = collectCashItems({
      today: "2026-08-22",
      invoices: [
        { id: "1", status: "sent", total: 10000, amount_paid: 2000, due_date: "2026-08-28", title: "Draw 1" },
        { id: "2", status: "paid", total: 4000, amount_paid: 4000, due_date: "2026-08-10" },
      ],
      draws: [{ id: "d1", status: "scheduled", amount: 5000, scheduled_date: "2026-09-04", title: "Draw 2" }],
      bills: [{ id: "b1", status: "open", amount: 1500, due_date: "2026-08-26", title: "Lumber" }],
      purchaseOrders: [
        { id: "p1", status: "issued", total: 3000, needed_by: "2026-09-01", po_number: "MAC-PO-001" },
        { id: "p2", status: "draft", total: 9000, needed_by: "2026-09-01" },
      ],
    });
    expect(items.map((i) => i.id)).toEqual(["bill-b1", "inv-1", "po-p1", "draw-d1"]);
    expect(items.find((i) => i.id === "inv-1")?.amount).toBe(8000);
  });
});

describe("bucketCashWeeks", () => {
  it("accumulates running cash Monday-aligned", () => {
    const items = collectCashItems({
      today: "2026-08-24",
      invoices: [{ id: "1", status: "sent", total: 10000, amount_paid: 0, due_date: "2026-08-26" }],
      draws: [],
      bills: [{ id: "b1", status: "open", amount: 2500, due_date: "2026-08-27" }],
      purchaseOrders: [],
    });
    const weeks = bucketCashWeeks(items, 1000, 2, "2026-08-24");
    expect(weeks[0]?.weekStart).toBe("2026-08-24");
    expect(weeks[0]?.inflow).toBe(10000);
    expect(weeks[0]?.outflow).toBe(2500);
    expect(weeks[0]?.running).toBe(8500);
  });
});
