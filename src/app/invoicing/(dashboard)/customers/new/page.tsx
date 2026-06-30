import Link from "next/link";
import { PageHeader } from "@/components/invoicing/PageHeader";
import { CustomerForm } from "@/components/invoicing/CustomerForm";

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader
        title="Add customer"
        subtitle="Keep customer details up to date for faster invoicing."
        action={
          <Link href="/invoicing/customers" className="inv-btn inv-btn-secondary">
            Back to customers
          </Link>
        }
      />
      <CustomerForm mode="create" />
    </>
  );
}
