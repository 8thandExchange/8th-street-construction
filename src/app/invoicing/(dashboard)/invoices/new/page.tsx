import Link from "next/link";
import { PageHeader } from "@/components/invoicing/PageHeader";
import { CreateInvoiceForm } from "@/components/invoicing/CreateInvoiceForm";
import { listCustomers, listProducts } from "@/lib/invoicing/service";

export default async function NewInvoicePage() {
  const [customers, products] = await Promise.all([listCustomers(), listProducts()]);

  return (
    <>
      <PageHeader
        title="Create invoice"
        subtitle="Generate a professional invoice in minutes."
        action={
          <Link href="/invoicing/invoices" className="inv-btn inv-btn-secondary">
            Back to invoices
          </Link>
        }
      />

      {customers.length === 0 ? (
        <div className="inv-card inv-empty">
          <div className="inv-empty-title">Add a customer first</div>
          <p className="inv-empty-text">
            You need at least one customer before you can create an invoice.
          </p>
          <Link href="/invoicing/customers/new" className="inv-btn inv-btn-primary">
            Add customer
          </Link>
        </div>
      ) : (
        <CreateInvoiceForm customers={customers} products={products} />
      )}
    </>
  );
}
