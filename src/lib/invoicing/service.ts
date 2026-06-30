import { getStripe } from "@/lib/stripe";
import type { LineItemInput } from "./types";
import { mapCustomer, mapInvoice, mapPaymentLink, mapProduct, mapPrice } from "./stripe-mappers";
import { getInvoicePaymentSettings, getInvoicingPaymentMethodTypes } from "./payment-settings";
import type Stripe from "stripe";

export async function listInvoices(limit = 100): Promise<ReturnType<typeof mapInvoice>[]> {
  const stripe = getStripe();
  const invoices = await stripe.invoices.list({
    limit,
    expand: ["data.customer"],
  });
  return invoices.data.map(mapInvoice);
}

export async function getInvoice(id: string) {
  const stripe = getStripe();
  const invoice = await stripe.invoices.retrieve(id, {
    expand: ["customer", "lines.data.price.product"],
  });
  return invoice;
}

export async function listCustomers(limit = 100) {
  const stripe = getStripe();
  const customers = await stripe.customers.list({ limit });
  const invoices = await stripe.invoices.list({ limit: 100 });

  const statsByCustomer = new Map<string, { invoiceCount: number; totalPaid: number }>();
  for (const invoice of invoices.data) {
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!customerId) continue;
    const current = statsByCustomer.get(customerId) ?? { invoiceCount: 0, totalPaid: 0 };
    current.invoiceCount += 1;
    if (invoice.status === "paid") current.totalPaid += invoice.amount_paid;
    statsByCustomer.set(customerId, current);
  }

  return customers.data.map((customer) =>
    mapCustomer(customer, statsByCustomer.get(customer.id))
  );
}

export async function getCustomer(id: string) {
  const stripe = getStripe();
  return stripe.customers.retrieve(id);
}

export async function createCustomer(input: {
  name: string;
  email?: string;
  phone?: string;
  contactName?: string;
  address?: Stripe.AddressParam;
  metadata?: Record<string, string>;
}) {
  const stripe = getStripe();
  const metadata = { ...input.metadata };
  if (input.contactName) metadata.contact_name = input.contactName;

  const customer = await stripe.customers.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    address: input.address,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  });
  return mapCustomer(customer);
}

export async function updateCustomer(
  id: string,
  input: {
    name?: string;
    email?: string;
    phone?: string;
    contactName?: string;
    address?: Stripe.AddressParam;
    metadata?: Record<string, string>;
  }
) {
  const stripe = getStripe();
  const existing = await stripe.customers.retrieve(id);
  if (existing.deleted) {
    throw new Error("Customer not found");
  }

  const metadata = { ...existing.metadata, ...input.metadata };
  if (input.contactName !== undefined) {
    if (input.contactName) metadata.contact_name = input.contactName;
    else delete metadata.contact_name;
  }

  const customer = await stripe.customers.update(id, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    address: input.address,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  });
  return mapCustomer(customer);
}

export async function deleteCustomer(id: string) {
  const stripe = getStripe();
  return stripe.customers.del(id);
}

export async function listProducts() {
  const stripe = getStripe();
  const [products, prices] = await Promise.all([
    stripe.products.list({ active: true, limit: 100 }),
    stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] }),
  ]);

  const pricesByProduct = new Map<string, Stripe.Price[]>();
  for (const price of prices.data) {
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const list = pricesByProduct.get(productId) ?? [];
    list.push(price);
    pricesByProduct.set(productId, list);
  }

  return products.data.map((product) =>
    mapProduct(product, pricesByProduct.get(product.id) ?? [])
  );
}

export async function listPrices() {
  const stripe = getStripe();
  const prices = await stripe.prices.list({ active: true, limit: 100 });
  return prices.data.map(mapPrice);
}

export async function createInvoice(input: {
  customerId: string;
  lineItems: LineItemInput[];
  /** Absolute due date (unix seconds). Use for a specific calendar date. */
  dueDate?: number;
  /** Net terms in days. 0 = due on receipt. Ignored when dueDate is set. */
  daysUntilDue?: number;
  memo?: string;
  footer?: string;
  autoSend?: boolean;
  collectionMethod?: "charge_automatically" | "send_invoice";
}) {
  const stripe = getStripe();
  const collectionMethod = input.collectionMethod ?? "send_invoice";

  // Guard: emailing an invoice requires a customer email. Catch this up front
  // with a clear message instead of letting Stripe fail after the invoice has
  // already been finalized (which would leave an unsendable open invoice).
  if (input.autoSend && collectionMethod === "send_invoice") {
    const customer = await stripe.customers.retrieve(input.customerId);
    const email = "deleted" in customer && customer.deleted ? null : customer.email;
    if (!email) {
      throw new Error(
        "This customer has no email on file. Add an email to the customer, or save the invoice as a draft."
      );
    }
  }

  const paymentSettings = getInvoicePaymentSettings();

  const params: Stripe.InvoiceCreateParams = {
    customer: input.customerId,
    collection_method: collectionMethod,
    description: input.memo,
    footer: input.footer,
    auto_advance: false,
    ...(paymentSettings ? { payment_settings: paymentSettings } : {}),
  };

  // Stripe rejects sending both due_date and days_until_due. Pick exactly one,
  // and only for send_invoice (charge_automatically has no payment terms).
  if (collectionMethod === "send_invoice") {
    if (input.dueDate) {
      params.due_date = input.dueDate;
    } else {
      params.days_until_due = input.daysUntilDue ?? 30;
    }
  }

  const invoice = await stripe.invoices.create(params);
  if (!invoice.id) {
    throw new Error("Stripe did not return an invoice id");
  }

  try {
    for (const item of input.lineItems) {
      if (item.priceId) {
        await stripe.invoiceItems.create({
          customer: input.customerId,
          invoice: invoice.id,
          pricing: { price: item.priceId },
          quantity: item.quantity,
          description: item.description || undefined,
        });
      } else if (item.unitAmountDecimal != null || item.unitAmount != null) {
        const unitAmountDecimal = item.unitAmountDecimal ?? String(item.unitAmount);
        await stripe.invoiceItems.create({
          customer: input.customerId,
          invoice: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_amount_decimal: unitAmountDecimal as unknown as Stripe.Decimal,
          currency: item.currency ?? "usd",
        });
      }
    }

    if (input.autoSend) {
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      if (!finalized.id) {
        throw new Error("Stripe did not return a finalized invoice id");
      }
      await stripe.invoices.sendInvoice(finalized.id);
    }
  } catch (error) {
    if (invoice.status === "draft") {
      await stripe.invoices.del(invoice.id).catch(() => undefined);
    }
    throw error;
  }

  return mapInvoice(
    await stripe.invoices.retrieve(invoice.id, { expand: ["customer"] })
  );
}

export async function sendInvoice(id: string) {
  const stripe = getStripe();
  let invoice = await stripe.invoices.retrieve(id);

  if (invoice.status === "draft") {
    invoice = await stripe.invoices.finalizeInvoice(id);
  }

  const sent = await stripe.invoices.sendInvoice(invoice.id);
  return mapInvoice(sent);
}

export async function voidInvoice(id: string) {
  const stripe = getStripe();
  const invoice = await stripe.invoices.voidInvoice(id);
  return mapInvoice(invoice);
}

export async function markInvoicePaid(id: string) {
  const stripe = getStripe();
  const invoice = await stripe.invoices.pay(id, { paid_out_of_band: true });
  return mapInvoice(invoice);
}

export async function sendInvoiceReminder(id: string) {
  const stripe = getStripe();
  const invoice = await stripe.invoices.sendInvoice(id);
  return mapInvoice(invoice);
}

export async function listPaymentLinks() {
  const stripe = getStripe();
  const links = await stripe.paymentLinks.list({
    limit: 100,
    expand: ["data.line_items.data.price"],
  });
  return links.data.map(mapPaymentLink);
}

export async function createPaymentLink(input: {
  priceId?: string;
  name?: string;
  amount?: number;
  currency?: string;
  description?: string;
}) {
  const stripe = getStripe();

  const lineItems = input.priceId
    ? [{ price: input.priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: input.currency ?? "usd",
            product_data: {
              name: input.description ?? input.name ?? "Payment",
            },
            unit_amount: input.amount ?? 0,
          },
          quantity: 1,
        },
      ];

  const link = await stripe.paymentLinks.create({
    line_items: lineItems,
    payment_method_types: getInvoicingPaymentMethodTypes() as Stripe.PaymentLinkCreateParams["payment_method_types"],
    metadata: {
      name: input.name ?? "",
      currency: input.currency ?? "usd",
      created: String(Math.floor(Date.now() / 1000)),
    },
  });

  return mapPaymentLink(link);
}

export async function getDashboardStats() {
  const invoices = await listInvoices(100);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;

  let outstanding = 0;
  let overdue = 0;
  let paidThisMonth = 0;
  let draftCount = 0;
  let openCount = 0;
  let paidCount = 0;

  for (const invoice of invoices) {
    if (invoice.status === "draft") draftCount += 1;
    if (invoice.status === "open") {
      openCount += 1;
      outstanding += invoice.amountDue;
      if (invoice.dueDate && invoice.dueDate * 1000 < Date.now()) {
        overdue += invoice.amountDue;
      }
    }
    if (invoice.status === "paid") {
      paidCount += 1;
      if (invoice.created >= monthStart) {
        paidThisMonth += invoice.amountPaid;
      }
    }
  }

  return {
    outstanding,
    overdue,
    paidThisMonth,
    draftCount,
    openCount,
    paidCount,
    currency: invoices[0]?.currency ?? "usd",
  };
}
