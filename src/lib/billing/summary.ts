export type DrawRecord = {
  id: string;
  draw_number: number;
  title: string;
  description: string | null;
  amount: number;
  percent_of_contract: number | null;
  status: string;
  scheduled_date: string | null;
  invoice_id: string | null;
};

export type InvoiceRecord = {
  id: string;
  invoice_number: string;
  title: string | null;
  status: string;
  total: number;
  amount_paid: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  mercury_pay_slug?: string | null;
  mercury_status?: string | null;
  line_items?: {
    description: string;
    quantity: number;
    unit_amount: number;
    amount: number;
  }[];
};

export type BillingSummary = {
  contract: number;
  changeOrders: number;
  revisedContract: number;
  invoiced: number;
  paid: number;
  balance: number;
  remaining: number;
  paidPct: number;
  drawCount: number;
  drawsComplete: number;
};

export function computeBillingSummary(
  contractValue: number,
  changeOrderTotal: number,
  draws: Pick<DrawRecord, "amount" | "status">[]
): BillingSummary {
  const contract = Number(contractValue) || 0;
  const changeOrders = Number(changeOrderTotal) || 0;
  const revisedContract = contract + changeOrders;

  const invoiced = draws
    .filter((d) => d.status === "invoiced" || d.status === "paid")
    .reduce((s, d) => s + Number(d.amount), 0);

  const paid = draws
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + Number(d.amount), 0);

  const balance = Math.max(0, revisedContract - paid);
  const remaining = Math.max(0, revisedContract - invoiced);
  const paidPct =
    revisedContract > 0 ? Math.min(100, Math.round((paid / revisedContract) * 100)) : 0;

  const drawsComplete = draws.filter((d) => d.status === "paid").length;

  return {
    contract,
    changeOrders,
    revisedContract,
    invoiced,
    paid,
    balance,
    remaining,
    paidPct,
    drawCount: draws.length,
    drawsComplete,
  };
}

export type BillingSetupStep = 1 | 2 | "done";

export function getBillingSetupStep(
  contractValue: number,
  drawCount: number
): BillingSetupStep {
  if (!contractValue || contractValue <= 0) return 1;
  if (drawCount === 0) return 2;
  return "done";
}
