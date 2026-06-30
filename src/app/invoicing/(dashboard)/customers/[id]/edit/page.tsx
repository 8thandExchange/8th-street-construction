import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/invoicing/CustomerForm";
import { PageHeader } from "@/components/invoicing/PageHeader";
import { customerDisplayName } from "@/lib/invoicing/format";
import { getCustomer } from "@/lib/invoicing/service";

interface EditCustomerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer(id);
  } catch {
    notFound();
  }

  if (customer.deleted) notFound();

  return (
    <>
      <PageHeader
        title="Edit customer"
        subtitle={customerDisplayName(customer)}
        action={
          <Link href={`/invoicing/customers/${id}`} className="inv-btn inv-btn-secondary">
            Back to customer
          </Link>
        }
      />
      <CustomerForm
        mode="edit"
        customerId={id}
        initial={{
          name: customer.name ?? "",
          contactName: customer.metadata?.contact_name ?? "",
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          line1: customer.address?.line1 ?? "",
          line2: customer.address?.line2 ?? "",
          city: customer.address?.city ?? "",
          state: customer.address?.state ?? "",
          postalCode: customer.address?.postal_code ?? "",
        }}
      />
    </>
  );
}
