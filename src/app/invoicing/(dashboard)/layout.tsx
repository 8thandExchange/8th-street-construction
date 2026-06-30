import { InvoicingSidebar } from "@/components/invoicing/InvoicingSidebar";

export const dynamic = "force-dynamic";

export default function InvoicingDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="inv-layout flex min-h-screen">
      <InvoicingSidebar />
      <div className="inv-main">
        <div className="inv-topbar">
          <div className="text-[14px] font-medium text-[var(--inv-text-secondary)]">
            Accounts receivable
          </div>
        </div>
        <main className="inv-content">{children}</main>
      </div>
    </div>
  );
}
