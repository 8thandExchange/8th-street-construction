import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/invoicing/PageHeader";
import { InvoiceTable } from "@/components/invoicing/InvoiceTable";
import { InvoiceFilterBar } from "@/components/invoicing/InvoiceFilterBar";
import { listInvoices } from "@/lib/invoicing/service";
import { filterInvoices } from "@/lib/invoicing/stripe-mappers";
import type { InvoiceFilterStatus } from "@/lib/invoicing/types";

interface InvoicesPageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const status = (params.status as InvoiceFilterStatus) || "all";
  const search = params.q ?? "";
  const invoices = filterInvoices(await listInvoices(), status, search);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="View who owes you what, filter by status, and take action."
        action={
          <Link href="/invoicing/invoices/new" className="inv-btn inv-btn-primary">
            Create invoice
          </Link>
        }
      />

      <div className="inv-card">
        <Suspense fallback={null}>
          <InvoiceFilterBar />
        </Suspense>
        <InvoiceTable invoices={invoices} />
      </div>
    </>
  );
}
