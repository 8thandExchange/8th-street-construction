export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible";

export type InvoiceFilterStatus = InvoiceStatus | "overdue" | "all";

export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  displayStatus: InvoiceStatus | "overdue";
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  amountDue: number;
  amountPaid: number;
  total: number;
  currency: string;
  created: number;
  dueDate: number | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface CustomerSummary {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  created: number;
  balance: number;
  currency: string | null;
  invoiceCount: number;
  totalPaid: number;
}

export interface ProductOption {
  id: string;
  name: string;
  description: string | null;
  prices: PriceOption[];
}

export interface PriceOption {
  id: string;
  productId: string;
  nickname: string | null;
  unitAmount: number | null;
  currency: string;
  type: "one_time" | "recurring";
  interval: string | null;
}

export interface LineItemInput {
  priceId?: string;
  description: string;
  quantity: number;
  /** Unit price in cents (integer). Prefer unitAmountDecimal for fractional cent rates. */
  unitAmount?: number;
  /** Unit price in cents as a decimal string, e.g. "60" or "68.055" for Stripe. */
  unitAmountDecimal?: string;
  currency?: string;
}

export interface DashboardStats {
  outstanding: number;
  overdue: number;
  paidThisMonth: number;
  draftCount: number;
  openCount: number;
  paidCount: number;
  currency: string;
}

export interface PaymentLinkSummary {
  id: string;
  url: string;
  active: boolean;
  name: string | null;
  amount: number | null;
  currency: string;
  created: number | null;
}
