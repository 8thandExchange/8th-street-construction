export type CashFlowItem = {
  id: string;
  date: string;
  direction: "in" | "out";
  amount: number;
  label: string;
  kind: "invoice" | "draw" | "bill" | "po";
  projectTitle?: string | null;
};

export type CashWeek = {
  weekStart: string;
  inflow: number;
  outflow: number;
  net: number;
  running: number;
  items: CashFlowItem[];
};

function money(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mondayOf(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function invoiceBalance(total: number | string | null, paid: number | string | null): number {
  return Math.max(0, money(total) - money(paid));
}

export function collectCashItems(input: {
  today: string;
  invoices: {
    id: string;
    title?: string | null;
    invoice_number?: string | null;
    status: string;
    total: number | string | null;
    amount_paid?: number | string | null;
    due_date: string | null;
    projectTitle?: string | null;
  }[];
  draws: {
    id: string;
    title?: string | null;
    status: string;
    amount: number | string | null;
    scheduled_date: string | null;
    projectTitle?: string | null;
  }[];
  bills: {
    id: string;
    title?: string | null;
    status: string;
    amount: number | string | null;
    due_date: string | null;
    projectTitle?: string | null;
  }[];
  purchaseOrders: {
    id: string;
    po_number?: string | null;
    title?: string | null;
    status: string;
    total: number | string | null;
    needed_by: string | null;
    projectTitle?: string | null;
  }[];
}): CashFlowItem[] {
  const items: CashFlowItem[] = [];

  for (const invoice of input.invoices) {
    if (["draft", "paid", "void"].includes(invoice.status)) continue;
    const amount = invoiceBalance(invoice.total, invoice.amount_paid ?? 0);
    if (amount <= 0) continue;
    items.push({
      id: `inv-${invoice.id}`,
      date: invoice.due_date || input.today,
      direction: "in",
      amount,
      label: invoice.title || invoice.invoice_number || "Invoice",
      kind: "invoice",
      projectTitle: invoice.projectTitle,
    });
  }

  for (const draw of input.draws) {
    if (draw.status !== "scheduled") continue;
    const amount = money(draw.amount);
    if (amount <= 0) continue;
    items.push({
      id: `draw-${draw.id}`,
      date: draw.scheduled_date || input.today,
      direction: "in",
      amount,
      label: draw.title || "Scheduled draw",
      kind: "draw",
      projectTitle: draw.projectTitle,
    });
  }

  for (const bill of input.bills) {
    if (bill.status !== "open") continue;
    const amount = money(bill.amount);
    if (amount <= 0) continue;
    items.push({
      id: `bill-${bill.id}`,
      date: bill.due_date || input.today,
      direction: "out",
      amount,
      label: bill.title || "Vendor bill",
      kind: "bill",
      projectTitle: bill.projectTitle,
    });
  }

  for (const po of input.purchaseOrders) {
    if (po.status !== "issued") continue;
    const amount = money(po.total);
    if (amount <= 0) continue;
    items.push({
      id: `po-${po.id}`,
      date: po.needed_by || input.today,
      direction: "out",
      amount,
      label: po.po_number || po.title || "Issued PO",
      kind: "po",
      projectTitle: po.projectTitle,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
}

export function bucketCashWeeks(
  items: CashFlowItem[],
  startingCash = 0,
  weekCount = 8,
  today?: string
): CashWeek[] {
  const start = mondayOf(today ?? new Date().toISOString().slice(0, 10));
  const weeks: CashWeek[] = [];
  let cursor = new Date(`${start}T12:00:00`);
  let running = startingCash;

  for (let i = 0; i < weekCount; i++) {
    const weekStart = cursor.toISOString().slice(0, 10);
    const next = new Date(cursor);
    next.setDate(next.getDate() + 7);
    const weekEnd = next.toISOString().slice(0, 10);
    const weekItems = items.filter((item) => item.date >= weekStart && item.date < weekEnd);
    const inflow = weekItems
      .filter((item) => item.direction === "in")
      .reduce((sum, item) => sum + item.amount, 0);
    const outflow = weekItems
      .filter((item) => item.direction === "out")
      .reduce((sum, item) => sum + item.amount, 0);
    running = Math.round((running + inflow - outflow) * 100) / 100;
    weeks.push({
      weekStart,
      inflow: Math.round(inflow * 100) / 100,
      outflow: Math.round(outflow * 100) / 100,
      net: Math.round((inflow - outflow) * 100) / 100,
      running,
      items: weekItems,
    });
    cursor = next;
  }

  return weeks;
}
