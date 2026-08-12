import { describe, it, expect } from "vitest";
import { aggregateQuotes, type BidRow } from "../cost-plan";

const line = (id: string, awarded: number | null = null) => ({ id, awarded_amount: awarded });

const bid = (lineId: string | null, amount: number, status: string | null = "submitted", company?: string): BidRow => ({
  amount,
  status,
  subcontractors: company ? { company_name: company } : null,
  bid_requests: { estimate_line_id: lineId },
});

describe("aggregateQuotes", () => {
  it("reports the lowest quote and how many are in", () => {
    const q = aggregateQuotes([line("a")], [bid("a", 9000), bid("a", 7500), bid("a", 8200)]);
    expect(q.a.low).toBe(7500);
    expect(q.a.count).toBe(3);
    expect(q.a.awarded).toBeNull();
  });

  it("takes awarded from the line, not from the bids", () => {
    // The award was negotiated to 8000; no bid says 8000.
    const q = aggregateQuotes([line("a", 8000)], [bid("a", 9000), bid("a", 8600)]);
    expect(q.a.awarded).toBe(8000);
    expect(q.a.low).toBe(8600);
  });

  it("names who an accepted bid is with", () => {
    const q = aggregateQuotes([line("a")], [bid("a", 5000, "accepted", "B&H Construction")]);
    expect(q.a.awardedTo).toBe("B&H Construction");
    expect(q.a.awarded).toBe(5000);
  });

  it("ignores withdrawn, rejected and declined bids entirely", () => {
    const q = aggregateQuotes(
      [line("a")],
      [bid("a", 100, "withdrawn"), bid("a", 200, "rejected"), bid("a", 300, "declined"), bid("a", 4000)]
    );
    expect(q.a.low).toBe(4000);
    expect(q.a.count).toBe(1);
  });

  it("drops bids that reach no cost line", () => {
    // A bid request raised before anyone picked a code.
    expect(aggregateQuotes([line("a")], [bid(null, 5000)])).toEqual({});
  });

  it("ignores zero and non-numeric amounts rather than reporting a $0 quote", () => {
    const q = aggregateQuotes([line("a")], [bid("a", 0), { ...bid("a", 0), amount: null }, bid("a", 1200)]);
    expect(q.a.low).toBe(1200);
    expect(q.a.count).toBe(1);
  });

  it("leaves a line with no bids and no award out of the map", () => {
    expect(aggregateQuotes([line("a"), line("b")], [])).toEqual({});
  });

  it("keeps each line's quotes separate", () => {
    const q = aggregateQuotes([line("a"), line("b")], [bid("a", 100), bid("b", 900), bid("b", 400)]);
    expect(q.a.low).toBe(100);
    expect(q.b.low).toBe(400);
    expect(q.b.count).toBe(2);
  });

  it("still reports an award when the awarded bid was recorded elsewhere", () => {
    // Line carries the award; the only live bid is a losing one.
    const q = aggregateQuotes([line("a", 6000)], [bid("a", 9500)]);
    expect(q.a.awarded).toBe(6000);
    expect(q.a.count).toBe(1);
  });
});
