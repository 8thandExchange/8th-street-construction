/**
 * Draw packet math — an Application & Certificate for Payment in the format
 * of AIA G702/G703, the form Augusta requires for Habitat/HUD HOME
 * pay-for-performance draws (payments made "on a per performance request
 * through the AIA Document"; 24 CFR Part 92).
 *
 * The project's payment draws are the schedule of values. "Previous
 * applications" are draws with a lower draw number already invoiced or paid;
 * the selected draw is "this period."
 */

export type PacketDrawInput = {
  id: string;
  draw_number: number;
  title: string;
  description?: string | null;
  amount: number;
  status: string; // scheduled | invoiced | paid
  scheduled_date?: string | null;
};

export type PacketLine = {
  itemNo: number;
  description: string;
  detail: string | null;
  scheduledValue: number;
  previousApplications: number;
  thisPeriod: number;
  percentComplete: number;
  balanceToFinish: number;
  isCurrent: boolean;
};

export type DrawPacket = {
  currentDraw: PacketDrawInput;
  lines: PacketLine[];
  totals: {
    scheduledValue: number;
    previousApplications: number;
    thisPeriod: number;
    balanceToFinish: number;
  };
  /** G702-style summary, lines 1–9 */
  summary: {
    originalContractSum: number;
    netChangeOrders: number;
    contractSumToDate: number;
    totalCompletedToDate: number;
    retainagePct: number;
    retainageAmount: number;
    totalEarnedLessRetainage: number;
    lessPreviousCertificates: number;
    currentPaymentDue: number;
    balanceToFinishIncludingRetainage: number;
  };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeDrawPacket(input: {
  contractValue: number;
  changeOrderTotal: number;
  draws: PacketDrawInput[];
  currentDrawId: string;
  retainagePct?: number;
}): DrawPacket | { error: string } {
  const retainagePct = Math.min(Math.max(input.retainagePct ?? 0, 0), 50);
  const draws = [...input.draws].sort((a, b) => a.draw_number - b.draw_number);
  const current = draws.find((d) => d.id === input.currentDrawId);
  if (!current) return { error: "Draw not found on this project" };

  const isPrevious = (d: PacketDrawInput) =>
    d.draw_number < current.draw_number && (d.status === "invoiced" || d.status === "paid");

  const lines: PacketLine[] = draws.map((d) => {
    const previousApplications = isPrevious(d) ? round2(Number(d.amount)) : 0;
    const thisPeriod = d.id === current.id ? round2(Number(d.amount)) : 0;
    const scheduledValue = round2(Number(d.amount));
    const completed = round2(previousApplications + thisPeriod);
    return {
      itemNo: d.draw_number,
      description: d.title,
      detail: d.description ?? null,
      scheduledValue,
      previousApplications,
      thisPeriod,
      percentComplete: scheduledValue > 0 ? round2((completed / scheduledValue) * 100) : 0,
      balanceToFinish: round2(scheduledValue - completed),
      isCurrent: d.id === current.id,
    };
  });

  const totals = {
    scheduledValue: round2(lines.reduce((s, l) => s + l.scheduledValue, 0)),
    previousApplications: round2(lines.reduce((s, l) => s + l.previousApplications, 0)),
    thisPeriod: round2(lines.reduce((s, l) => s + l.thisPeriod, 0)),
    balanceToFinish: round2(lines.reduce((s, l) => s + l.balanceToFinish, 0)),
  };

  const originalContractSum = round2(input.contractValue);
  const netChangeOrders = round2(input.changeOrderTotal);
  const contractSumToDate = round2(originalContractSum + netChangeOrders);
  const totalCompletedToDate = round2(totals.previousApplications + totals.thisPeriod);
  const retainageAmount = round2((totalCompletedToDate * retainagePct) / 100);
  const totalEarnedLessRetainage = round2(totalCompletedToDate - retainageAmount);
  const lessPreviousCertificates = round2(
    totals.previousApplications * (1 - retainagePct / 100)
  );
  const currentPaymentDue = round2(totalEarnedLessRetainage - lessPreviousCertificates);
  const balanceToFinishIncludingRetainage = round2(contractSumToDate - totalEarnedLessRetainage);

  return {
    currentDraw: current,
    lines,
    totals,
    summary: {
      originalContractSum,
      netChangeOrders,
      contractSumToDate,
      totalCompletedToDate,
      retainagePct,
      retainageAmount,
      totalEarnedLessRetainage,
      lessPreviousCertificates,
      currentPaymentDue,
      balanceToFinishIncludingRetainage,
    },
  };
}

/** Pick the draw a packet most likely targets: first invoiced-not-paid, else first scheduled, else last. */
export function defaultPacketDrawId(draws: PacketDrawInput[]): string | null {
  const sorted = [...draws].sort((a, b) => a.draw_number - b.draw_number);
  return (
    sorted.find((d) => d.status === "invoiced")?.id ??
    sorted.find((d) => d.status === "scheduled")?.id ??
    sorted[sorted.length - 1]?.id ??
    null
  );
}
