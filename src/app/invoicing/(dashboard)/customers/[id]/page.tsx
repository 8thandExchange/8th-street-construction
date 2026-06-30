import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/invoicing/PageHeader";
import { formatDate, formatMoney } from "@/lib/invoicing/format";
import { getCustomer, listInvoices } from "@/lib/invoicing/service";
import { mapCustomer } from "@/lib/invoicing/stripe-mappers";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

function contactSubtitle(customer: ReturnType<typeof mapCustomer>) {
  if (customer.email) return customer.email;
  if (customer.contactName) return customer.contactName;
  if (customer.phone) return customer.phone;
  return "No contact email on file";
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;

  let customerRaw;
  try {
    customerRaw = await getCustomer(id);
  } catch {
    notFound();
  }

  if (customerRaw.deleted) notFound();

  const customer = mapCustomer(customerRaw);
  const invoices = (await listInvoices()).filter((invoice) => invoice.customerId === id);

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={contactSubtitle(customer)}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/invoicing/customers/${customer.id}/edit`} className="inv-btn inv-btn-secondary">
              Edit customer
            </Link>
            <Link
              href={`/invoicing/invoices/new?customer=${customer.id}`}
              className="inv-btn inv-btn-primary"
            >
              Send invoice
            </Link>
          </div>
        }
      />

      <div className="inv-detail-grid">
        <div className="inv-card inv-detail-section">
          <div className="flex items-start justify-between gap-3">
            <div className="inv-detail-label">Contact</div>
            <Link href={`/invoicing/customers/${customer.id}/edit`} className="inv-link text-[13px]">
              Edit
            </Link>
          </div>
          <div className="space-y-2 text-[14px]">
            <div className="flex justify-between gap-4">
              <span className="text-[var(--inv-text-secondary)]">Contact name</span>
              <span>{customer.contactName ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--inv-text-secondary)]">Email</span>
              <span>{customer.email ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--inv-text-secondary)]">Phone</span>
              <span>{customer.phone ?? "—"}</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="inv-detail-label">Address</div>
            {customerRaw.address?.line1 ? (
              <div className="text-[14px] text-[var(--inv-text-secondary)]">
                {[
                  customerRaw.address.line1,
                  customerRaw.address.line2,
                  [customerRaw.address.city, customerRaw.address.state, customerRaw.address.postal_code]
                    .filter(Boolean)
                    .join(", "),
                ]
                  .filter(Boolean)
                  .map((line) => (
                    <div key={line}>{line}</div>
                  ))}
              </div>
            ) : (
              <div className="text-[14px] text-[var(--inv-text-secondary)]">—</div>
            )}
          </div>
        </div>

        <div className="inv-card inv-detail-section">
          <div className="inv-detail-label">Activity</div>
          <div className="space-y-3 text-[14px]">
            <div className="flex justify-between">
              <span className="text-[var(--inv-text-secondary)]">Customer since</span>
              <span>{formatDate(customer.created)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--inv-text-secondary)]">Invoices</span>
              <span>{invoices.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--inv-text-secondary)]">Total paid</span>
              <span>
                {formatMoney(
                  invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
                  customer.currency ?? "usd"
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="inv-card mt-5">
        <div className="px-5 py-4 border-b border-[var(--inv-border)] font-medium">Invoices</div>
        {invoices.length === 0 ? (
          <div className="inv-empty">
            <div className="inv-empty-title">No invoices yet</div>
            <p className="inv-empty-text">Send the first invoice to this customer.</p>
          </div>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th>Due</th>
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
                    <td>{invoice.displayStatus}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td>{formatMoney(invoice.amountDue, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
