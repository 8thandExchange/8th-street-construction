import type { InvoiceStatus } from "./types";

export function formatMoney(amount: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export function formatDate(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(unixSeconds * 1000));
}

export function formatDateInput(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return "";
  const date = new Date(unixSeconds * 1000);
  return date.toISOString().slice(0, 10);
}

export function parseDateInput(value: string): number | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "open":
      return "Open";
    case "paid":
      return "Paid";
    case "void":
      return "Void";
    case "uncollectible":
      return "Uncollectible";
    default:
      return status;
  }
}

export function isInvoiceOverdue(
  status: InvoiceStatus,
  dueDate: number | null | undefined
): boolean {
  if (status !== "open" || !dueDate) return false;
  return dueDate * 1000 < Date.now();
}

export function displayInvoiceStatus(
  status: InvoiceStatus,
  dueDate?: number | null
): InvoiceStatus | "overdue" {
  if (isInvoiceOverdue(status, dueDate)) return "overdue";
  return status;
}

export function customerDisplayName(customer: {
  name?: string | null;
  email?: string | null;
}): string {
  return customer.name?.trim() || customer.email?.trim() || "Unnamed customer";
}
