export type MercuryCustomer = {
  id: string;
  name: string;
  email: string;
};

export type MercuryLineItem = {
  name: string;
  unitPrice: number;
  quantity: number;
  salesTaxRate?: number | null;
};

export type MercuryInvoiceStatus = "Unpaid" | "Paid" | "Cancelled" | "Processing";

export type MercuryInvoice = {
  id: string;
  invoiceNumber: string;
  slug: string;
  status: MercuryInvoiceStatus;
  amount: number;
  dueDate: string;
  invoiceDate: string;
  customerId: string;
  lineItems: MercuryLineItem[];
  creditCardEnabled: boolean;
  achDebitEnabled: boolean;
};

export type CreateMercuryInvoiceInput = {
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: MercuryLineItem[];
  payerMemo?: string;
  internalNote?: string;
  sendEmailOption?: "DontSend" | "SendNow";
  creditCardEnabled?: boolean;
  achDebitEnabled?: boolean;
  useRealAccountNumber?: boolean;
  ccEmails?: string[];
};
