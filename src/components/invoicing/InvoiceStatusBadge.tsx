import type { InvoiceStatus } from "@/lib/invoicing/types";
import { invoiceStatusLabel } from "@/lib/invoicing/format";
import { cn } from "@/lib/utils";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus | "overdue";
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const label = status === "overdue" ? "Overdue" : invoiceStatusLabel(status);

  return (
    <span
      className={cn(
        "inv-badge",
        status === "draft" && "inv-badge-draft",
        status === "open" && "inv-badge-open",
        status === "paid" && "inv-badge-paid",
        status === "overdue" && "inv-badge-overdue",
        status === "void" && "inv-badge-void",
        status === "uncollectible" && "inv-badge-overdue"
      )}
    >
      {label}
    </span>
  );
}
