export type MonthCloseException = {
  id: string;
  severity: "critical" | "warning";
  label: string;
  href: string;
};

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function collectMonthCloseExceptions(input: {
  month: string;
  invoices: { id: string; status: string; due_date: string | null; projectId?: string | null }[];
  bills: {
    id: string;
    status: string;
    due_date: string | null;
    allocated?: boolean;
    projectId?: string | null;
  }[];
  purchaseOrders: { id: string; status: string; acknowledged_at?: string | null; projectId?: string | null }[];
  contracts: { id: string; status: string }[];
}): MonthCloseException[] {
  const exceptions: MonthCloseException[] = [];

  for (const invoice of input.invoices) {
    if (invoice.status === "draft") {
      exceptions.push({
        id: `draft-inv-${invoice.id}`,
        severity: "warning",
        label: "Draft invoice still open",
        href: invoice.projectId ? `/admin/projects/${invoice.projectId}/billing` : "/admin/invoicing",
      });
    }
    if (
      !["draft", "paid", "void"].includes(invoice.status) &&
      invoice.due_date &&
      invoice.due_date.slice(0, 7) <= input.month
    ) {
      exceptions.push({
        id: `open-inv-${invoice.id}`,
        severity: "critical",
        label: "Unpaid invoice due this month or earlier",
        href: invoice.projectId ? `/admin/projects/${invoice.projectId}/billing` : "/admin/invoicing",
      });
    }
  }

  for (const bill of input.bills) {
    if (bill.status === "open" && bill.due_date && bill.due_date.slice(0, 7) <= input.month) {
      exceptions.push({
        id: `open-bill-${bill.id}`,
        severity: "critical",
        label: "Open vendor bill due this month or earlier",
        href: "/admin/vendors",
      });
    }
    if (bill.status !== "void" && bill.allocated === false) {
      exceptions.push({
        id: `uncoded-bill-${bill.id}`,
        severity: "warning",
        label: "Vendor bill is not coded to a cost line",
        href: bill.projectId ? `/admin/projects/${bill.projectId}/costs` : "/admin/vendors",
      });
    }
  }

  for (const po of input.purchaseOrders) {
    if (po.status === "issued" && !po.acknowledged_at) {
      exceptions.push({
        id: `ack-po-${po.id}`,
        severity: "warning",
        label: "Issued purchase order has no acknowledgement",
        href: po.projectId
          ? `/admin/projects/${po.projectId}/purchase-orders`
          : "/admin/accounting",
      });
    }
  }

  for (const contract of input.contracts) {
    if (contract.status === "out_for_signature") {
      exceptions.push({
        id: `sign-${contract.id}`,
        severity: "warning",
        label: "Agreement is still out for signature",
        href: `/admin/contracts/${contract.id}`,
      });
    }
  }

  return exceptions;
}

export function canCloseMonth(exceptions: MonthCloseException[]): boolean {
  return !exceptions.some((item) => item.severity === "critical");
}
