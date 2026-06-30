import type Stripe from "stripe";
import {
  customerDisplayName,
  displayInvoiceStatus,
  isInvoiceOverdue,
} from "./format";
import type {
  CustomerSummary,
  InvoiceSummary,
  PaymentLinkSummary,
  PriceOption,
  ProductOption,
} from "./types";

export function mapInvoice(invoice: Stripe.Invoice): InvoiceSummary {
  const customer =
    typeof invoice.customer === "object" && invoice.customer && !("deleted" in invoice.customer)
      ? invoice.customer
      : null;

  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status ?? "draft",
    displayStatus: displayInvoiceStatus(invoice.status ?? "draft", invoice.due_date),
    customerId:
      typeof invoice.customer === "string"
        ? invoice.customer
        : (customer?.id ?? ""),
    customerName: customer ? customerDisplayName(customer) : "Unknown customer",
    customerEmail: customer?.email ?? null,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    total: invoice.total,
    currency: invoice.currency,
    created: invoice.created,
    dueDate: invoice.due_date,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
  };
}

export function mapCustomer(
  customer: Stripe.Customer,
  stats?: { invoiceCount: number; totalPaid: number }
): CustomerSummary {
  return {
    id: customer.id,
    name: customerDisplayName(customer),
    contactName: customer.metadata?.contact_name?.trim() || null,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    created: customer.created,
    balance: customer.balance,
    currency: customer.currency ?? null,
    invoiceCount: stats?.invoiceCount ?? 0,
    totalPaid: stats?.totalPaid ?? 0,
  };
}

export function mapProduct(product: Stripe.Product, prices: Stripe.Price[]): ProductOption {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    prices: prices.map(mapPrice),
  };
}

export function mapPrice(price: Stripe.Price): PriceOption {
  return {
    id: price.id,
    productId: typeof price.product === "string" ? price.product : price.product.id,
    nickname: price.nickname,
    unitAmount: price.unit_amount,
    currency: price.currency,
    type: price.type,
    interval: price.recurring?.interval ?? null,
  };
}

export function mapPaymentLink(link: Stripe.PaymentLink): PaymentLinkSummary {
  const lineItem = link.line_items?.data[0];
  const price = lineItem?.price;
  const amount =
    typeof price === "object" && price?.unit_amount
      ? price.unit_amount * (lineItem?.quantity ?? 1)
      : null;

  return {
    id: link.id,
    url: link.url,
    active: link.active,
    name: link.metadata?.name ?? null,
    amount,
    currency:
      (typeof price === "object" && price?.currency) ||
      link.metadata?.currency ||
      link.currency ||
      "usd",
    created: link.metadata?.created ? Number(link.metadata.created) : null,
  };
}

export function filterInvoices(
  invoices: InvoiceSummary[],
  status: string,
  search: string
): InvoiceSummary[] {
  const query = search.trim().toLowerCase();

  return invoices.filter((invoice) => {
    const statusMatch =
      status === "all" ||
      (status === "overdue"
        ? isInvoiceOverdue(invoice.status, invoice.dueDate)
        : invoice.status === status);

    if (!statusMatch) return false;
    if (!query) return true;

    return (
      invoice.number?.toLowerCase().includes(query) ||
      invoice.customerName.toLowerCase().includes(query) ||
      invoice.customerEmail?.toLowerCase().includes(query)
    );
  });
}
