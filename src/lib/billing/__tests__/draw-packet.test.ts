import { describe, expect, it } from "vitest";
import { computeDrawPacket, defaultPacketDrawId, type PacketDrawInput } from "../draw-packet";

const DRAWS: PacketDrawInput[] = [
  { id: "d1", draw_number: 1, title: "Foundation complete", amount: 20000, status: "paid" },
  { id: "d2", draw_number: 2, title: "Framing complete", amount: 30000, status: "invoiced" },
  { id: "d3", draw_number: 3, title: "Dry-in complete", amount: 25000, status: "scheduled" },
  { id: "d4", draw_number: 4, title: "Final completion", amount: 25000, status: "scheduled" },
];

describe("computeDrawPacket", () => {
  it("computes the G702 summary for a mid-project draw with no retainage", () => {
    const packet = computeDrawPacket({
      contractValue: 100000,
      changeOrderTotal: 0,
      draws: DRAWS,
      currentDrawId: "d2",
    });
    if ("error" in packet) throw new Error(packet.error);

    expect(packet.summary.contractSumToDate).toBe(100000);
    expect(packet.summary.totalCompletedToDate).toBe(50000); // draw 1 + draw 2
    expect(packet.summary.lessPreviousCertificates).toBe(20000);
    expect(packet.summary.currentPaymentDue).toBe(30000);
    expect(packet.summary.balanceToFinishIncludingRetainage).toBe(50000);
  });

  it("withholds retainage on completed work and nets it from previous certificates", () => {
    const packet = computeDrawPacket({
      contractValue: 100000,
      changeOrderTotal: 0,
      draws: DRAWS,
      currentDrawId: "d2",
      retainagePct: 10,
    });
    if ("error" in packet) throw new Error(packet.error);

    expect(packet.summary.retainageAmount).toBe(5000); // 10% of 50k
    expect(packet.summary.totalEarnedLessRetainage).toBe(45000);
    expect(packet.summary.lessPreviousCertificates).toBe(18000); // 20k less 10%
    expect(packet.summary.currentPaymentDue).toBe(27000); // 30k less 10%
  });

  it("includes approved change orders in the contract sum", () => {
    const packet = computeDrawPacket({
      contractValue: 100000,
      changeOrderTotal: 4500,
      draws: DRAWS,
      currentDrawId: "d2",
    });
    if ("error" in packet) throw new Error(packet.error);
    expect(packet.summary.contractSumToDate).toBe(104500);
    expect(packet.summary.balanceToFinishIncludingRetainage).toBe(54500);
  });

  it("builds continuation-sheet lines with % complete and balances", () => {
    const packet = computeDrawPacket({
      contractValue: 100000,
      changeOrderTotal: 0,
      draws: DRAWS,
      currentDrawId: "d2",
    });
    if ("error" in packet) throw new Error(packet.error);

    const [l1, l2, l3] = packet.lines;
    expect(l1.previousApplications).toBe(20000);
    expect(l1.percentComplete).toBe(100);
    expect(l1.balanceToFinish).toBe(0);
    expect(l2.thisPeriod).toBe(30000);
    expect(l2.isCurrent).toBe(true);
    expect(l3.percentComplete).toBe(0);
    expect(l3.balanceToFinish).toBe(25000);
    expect(packet.totals.scheduledValue).toBe(100000);
  });

  it("errors on an unknown draw id", () => {
    const packet = computeDrawPacket({
      contractValue: 100000,
      changeOrderTotal: 0,
      draws: DRAWS,
      currentDrawId: "nope",
    });
    expect("error" in packet).toBe(true);
  });
});

describe("defaultPacketDrawId", () => {
  it("prefers the first invoiced draw, then the first scheduled", () => {
    expect(defaultPacketDrawId(DRAWS)).toBe("d2");
    expect(
      defaultPacketDrawId(DRAWS.map((d) => ({ ...d, status: d.id === "d2" ? "paid" : d.status })))
    ).toBe("d3");
    expect(defaultPacketDrawId([])).toBeNull();
  });
});
