import Link from "next/link";
import { formatDate, formatMoney } from "@/lib/invoicing/format";
import type { CustomerSummary } from "@/lib/invoicing/types";

interface CustomerTableProps {
  customers: CustomerSummary[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <div className="inv-empty">
        <div className="inv-empty-title">No customers yet</div>
        <p className="inv-empty-text">
          Add customers to send invoices and track payment history in one place.
        </p>
        <Link href="/invoicing/customers/new" className="inv-btn inv-btn-primary">
          Add customer
        </Link>
      </div>
    );
  }

  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Invoices</th>
            <th>Total paid</th>
            <th>Added</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <Link href={`/invoicing/customers/${customer.id}`} className="inv-link">
                  {customer.name}
                </Link>
                {customer.email ? (
                  <div className="text-[13px] text-[var(--inv-text-muted)]">{customer.email}</div>
                ) : null}
              </td>
              <td>{customer.invoiceCount}</td>
              <td>{formatMoney(customer.totalPaid, customer.currency ?? "usd")}</td>
              <td>{formatDate(customer.created)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
