import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/invoicing/PageHeader";
import { InvoiceStatusBadge } from "@/components/invoicing/InvoiceStatusBadge";
import { InvoiceActions } from "@/components/invoicing/InvoiceActions";
import { formatDate, formatMoney } from "@/lib/invoicing/format";
import { getInvoice } from "@/lib/invoicing/service";
import { mapInvoice } from "@/lib/invoicing/stripe-mappers";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;

  let invoiceRaw;
  try {
    invoiceRaw = await getInvoice(id);
  } catch {
    notFound();
  }

  const invoice = mapInvoice(invoiceRaw);
  const lines = invoiceRaw.lines?.data ?? [];

  return (
    <>
      <PageHeader
        title={invoice.number ?? `Invoice ${invoice.id.slice(-8).toUpperCase()}`}
        subtitle={`Created ${formatDate(invoice.created)} · Due ${formatDate(invoice.dueDate)}`}
        action={<InvoiceStatusBadge status={invoice.displayStatus} />}
      />

      <div className="inv-detail-grid">
        <div className="inv-card">
          <div className="inv-detail-section">
            <div className="inv-detail-label">Customer</div>
            <div className="text-[16px] font-medium">{invoice.customerName}</div>
            {invoice.customerEmail ? (
              <div className="text-[14px] text-[var(--inv-text-secondary)] mt-1">
                {invoice.customerEmail}
              </div>
            ) : null}
            <div className="mt-3">
              <Link href={`/invoicing/customers/${invoice.customerId}`} className="inv-link text-[13px]">
                View customer
              </Link>
            </div>
          </div>

          <div className="inv-detail-section">
            <div className="inv-detail-label">Line items</div>
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td>{line.description}</td>
                      <td>{line.quantity}</td>
                      <td>{formatMoney(line.amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {invoiceRaw.description ? (
            <div className="inv-detail-section">
              <div className="inv-detail-label">Memo</div>
              <p className="text-[14px] text-[var(--inv-text-secondary)]">{invoiceRaw.description}</p>
            </div>
          ) : null}
        </div>

        <div className="inv-card inv-detail-section">
          <div className="inv-detail-label">Summary</div>
          <div className="space-y-3 text-[14px]">
            <div className="flex justify-between">
              <span className="text-[var(--inv-text-secondary)]">Total</span>
              <span className="font-medium">{formatMoney(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--inv-text-secondary)]">Paid</span>
              <span>{formatMoney(invoice.amountPaid, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-[16px] font-semibold pt-2 border-t border-[var(--inv-border)]">
              <span>Amount due</span>
              <span>{formatMoney(invoice.amountDue, invoice.currency)}</span>
            </div>
          </div>

          <div className="mt-6">
            <InvoiceActions
              invoiceId={invoice.id}
              status={invoice.status}
              hostedInvoiceUrl={invoice.hostedInvoiceUrl}
            />
          </div>

          {invoice.invoicePdf ? (
            <div className="mt-4">
              <a href={invoice.invoicePdf} target="_blank" rel="noreferrer" className="inv-link text-[13px]">
                Download PDF
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
