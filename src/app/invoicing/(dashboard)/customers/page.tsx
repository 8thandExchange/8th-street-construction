import Link from "next/link";
import { PageHeader } from "@/components/invoicing/PageHeader";
import { CustomerTable } from "@/components/invoicing/CustomerTable";
import { listCustomers } from "@/lib/invoicing/service";

export default async function CustomersPage() {
  const customers = await listCustomers();

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Manage profiles and send invoices from one place."
        action={
          <Link href="/invoicing/customers/new" className="inv-btn inv-btn-primary">
            Add customer
          </Link>
        }
      />

      <div className="inv-card">
        <CustomerTable customers={customers} />
      </div>
    </>
  );
}
