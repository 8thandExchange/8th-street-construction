import { PageHeader } from "@/components/invoicing/PageHeader";
import { CreatePaymentLinkForm } from "@/components/invoicing/CreatePaymentLinkForm";
import { formatDate, formatMoney } from "@/lib/invoicing/format";
import { listPaymentLinks, listProducts } from "@/lib/invoicing/service";

export default async function PaymentLinksPage() {
  const [links, products] = await Promise.all([listPaymentLinks(), listProducts()]);

  return (
    <>
      <PageHeader
        title="Payment links"
        subtitle="Create quick payment links for one-off or informal payments."
      />

      <CreatePaymentLinkForm products={products} />

      <div className="inv-card mt-6">
        <div className="px-5 py-4 border-b border-[var(--inv-border)] font-medium">
          Active links
        </div>
        {links.length === 0 ? (
          <div className="inv-empty">
            <div className="inv-empty-title">No payment links yet</div>
            <p className="inv-empty-text">
              Create a link above to collect payments without sending a full invoice.
            </p>
          </div>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td>{link.name ?? "Payment link"}</td>
                    <td>
                      {link.amount != null
                        ? formatMoney(link.amount, link.currency)
                        : "Variable"}
                    </td>
                    <td>{link.created ? formatDate(link.created) : "—"}</td>
                    <td>
                      <a href={link.url} target="_blank" rel="noreferrer" className="inv-link">
                        Open
                      </a>
                    </td>
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
