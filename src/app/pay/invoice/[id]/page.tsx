import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { SITE_NAME } from "@/lib/site";
import { formatDate, formatMoney } from "@/lib/invoicing/format";
import { getInvoice } from "@/lib/invoicing/service";
import { mapInvoice } from "@/lib/invoicing/stripe-mappers";

export const dynamic = "force-dynamic";

interface PayInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function PayInvoicePage({ params }: PayInvoicePageProps) {
  const { id } = await params;

  let invoiceRaw;
  try {
    invoiceRaw = await getInvoice(id);
  } catch {
    notFound();
  }

  const invoice = mapInvoice(invoiceRaw);

  if (invoice.hostedInvoiceUrl && invoice.status === "open") {
    redirect(invoice.hostedInvoiceUrl);
  }

  return (
    <div className="inv-pay-shell">
      <div className="inv-pay-card inv-card inv-detail-section">
        <div className="inv-pay-header">
          <Image
            src="/img/logo-icon.svg"
            alt=""
            width={48}
            height={48}
            className="mx-auto mb-4"
          />
          <div className="inv-page-title">{SITE_NAME}</div>
          <p className="inv-page-subtitle mt-2">
            Invoice {invoice.number ?? invoice.id.slice(-8).toUpperCase()}
          </p>
        </div>

        <div className="space-y-3 text-[14px] mb-6">
          <div className="flex justify-between">
            <span className="text-[var(--inv-text-secondary)]">Amount due</span>
            <span className="text-[20px] font-semibold">
              {formatMoney(invoice.amountDue, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--inv-text-secondary)]">Due date</span>
            <span>{formatDate(invoice.dueDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--inv-text-secondary)]">Status</span>
            <span className="capitalize">{invoice.displayStatus}</span>
          </div>
        </div>

        {invoice.status === "paid" ? (
          <div className="inv-alert inv-alert-success">This invoice has been paid. Thank you.</div>
        ) : invoice.hostedInvoiceUrl ? (
          <a href={invoice.hostedInvoiceUrl} className="inv-btn inv-btn-primary w-full">
            Pay invoice
          </a>
        ) : (
          <div className="inv-alert inv-alert-error">
            This invoice is not available for payment right now.
          </div>
        )}
      </div>
    </div>
  );
}
