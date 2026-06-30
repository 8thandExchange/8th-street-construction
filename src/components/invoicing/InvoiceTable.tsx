import Link from "next/link";
import { formatDate, formatMoney } from "@/lib/invoicing/format";
import type { InvoiceSummary } from "@/lib/invoicing/types";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

interface InvoiceTableProps {
  invoices: InvoiceSummary[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="inv-empty">
        <div className="inv-empty-title">No invoices yet</div>
        <p className="inv-empty-text">
          Create your first invoice to start tracking what you&apos;re owed.
        </p>
        <Link href="/invoicing/invoices/new" className="inv-btn inv-btn-primary">
          Create invoice
        </Link>
      </div>
    );
  }

  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Due date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <Link href={`/invoicing/invoices/${invoice.id}`} className="inv-link">
                  {invoice.number ?? invoice.id.slice(-8).toUpperCase()}
                </Link>
              </td>
              <td>
                <div>{invoice.customerName}</div>
                {invoice.customerEmail ? (
                  <div className="text-[13px] text-[var(--inv-text-muted)]">
                    {invoice.customerEmail}
                  </div>
                ) : null}
              </td>
              <td>
                <InvoiceStatusBadge status={invoice.displayStatus} />
              </td>
              <td>{formatDate(invoice.dueDate)}</td>
              <td className="font-medium">{formatMoney(invoice.amountDue, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
