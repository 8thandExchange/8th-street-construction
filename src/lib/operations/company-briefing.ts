export type BriefingInvoice = {
  status: string;
  total: number | string | null;
  amount_paid: number | string | null;
  due_date: string | null;
};

export type BriefingVendorBill = {
  status: string;
  amount: number | string | null;
  due_date: string | null;
};

export type BriefingCommitment = {
  status: string;
  due_date: string | null;
  priority?: string | null;
};

export type BriefingTask = {
  status: string;
  due_date: string | null;
};

export type CompanyBriefing = {
  receivables: {
    openAmount: number;
    openCount: number;
    overdueAmount: number;
    overdueCount: number;
    draftCount: number;
  };
  payables: {
    openAmount: number;
    openCount: number;
    overdueAmount: number;
    overdueCount: number;
  };
  commitments: {
    openCount: number;
    blockedCount: number;
    overdueCount: number;
  };
  schedule: {
    overdueTaskCount: number;
  };
};

function money(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPast(date: string | null, today: string): boolean {
  return Boolean(date && date < today);
}

export function buildCompanyBriefing(input: {
  today: string;
  invoices: BriefingInvoice[];
  vendorBills: BriefingVendorBill[];
  commitments: BriefingCommitment[];
  tasks: BriefingTask[];
}): CompanyBriefing {
  const openInvoices = input.invoices.filter(
    (invoice) => !["draft", "paid", "void"].includes(invoice.status)
  );
  const overdueInvoices = openInvoices.filter(
    (invoice) => invoice.status === "overdue" || isPast(invoice.due_date, input.today)
  );
  const openBills = input.vendorBills.filter((bill) => bill.status === "open");
  const overdueBills = openBills.filter((bill) => isPast(bill.due_date, input.today));
  const openCommitments = input.commitments.filter((item) =>
    ["open", "in_progress", "blocked"].includes(item.status)
  );
  const openTasks = input.tasks.filter(
    (task) => !["done", "cancelled"].includes(task.status)
  );

  const invoiceBalance = (invoice: BriefingInvoice) =>
    Math.max(0, money(invoice.total) - money(invoice.amount_paid));

  return {
    receivables: {
      openAmount: openInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0),
      openCount: openInvoices.length,
      overdueAmount: overdueInvoices.reduce(
        (sum, invoice) => sum + invoiceBalance(invoice),
        0
      ),
      overdueCount: overdueInvoices.length,
      draftCount: input.invoices.filter((invoice) => invoice.status === "draft").length,
    },
    payables: {
      openAmount: openBills.reduce((sum, bill) => sum + money(bill.amount), 0),
      openCount: openBills.length,
      overdueAmount: overdueBills.reduce((sum, bill) => sum + money(bill.amount), 0),
      overdueCount: overdueBills.length,
    },
    commitments: {
      openCount: openCommitments.length,
      blockedCount: openCommitments.filter((item) => item.status === "blocked").length,
      overdueCount: openCommitments.filter((item) => isPast(item.due_date, input.today)).length,
    },
    schedule: {
      overdueTaskCount: openTasks.filter((task) => isPast(task.due_date, input.today)).length,
    },
  };
}
