import Link from "next/link";
import { PageHeader } from "@/components/invoicing/PageHeader";
import { SummaryCards } from "@/components/invoicing/SummaryCards";
import { InvoiceTable } from "@/components/invoicing/InvoiceTable";
import { getDashboardStats, listInvoices } from "@/lib/invoicing/service";

export default async function InvoicingOverviewPage() {
  const [stats, invoices] = await Promise.all([getDashboardStats(), listInvoices()]);

  return (
    <>
      <PageHeader
        title="Invoicing"
        subtitle="Send polished invoices, track what you're owed, and get paid."
        action={
          <Link href="/invoicing/invoices/new" className="inv-btn inv-btn-primary">
            Create invoice
          </Link>
        }
      />

      <SummaryCards stats={stats} />

      <div className="inv-card">
        <div className="px-5 py-4 border-b border-[var(--inv-border)] flex items-center justify-between">
          <div className="font-medium">Recent invoices</div>
          <Link href="/invoicing/invoices" className="inv-link text-[13px]">
            View all
          </Link>
        </div>
        <InvoiceTable invoices={invoices.slice(0, 8)} />
      </div>
    </>
  );
}
