"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/invoicing", label: "Overview", exact: true },
  { href: "/invoicing/invoices", label: "Invoices" },
  { href: "/invoicing/customers", label: "Customers" },
  { href: "/invoicing/payment-links", label: "Payment links" },
];

export function InvoicingSidebar() {
  const pathname = usePathname();

  return (
    <aside className="inv-sidebar">
      <div className="inv-sidebar-brand">
        <Image
          src="/img/logo-icon.svg"
          alt=""
          width={36}
          height={36}
          className="inv-sidebar-brand-mark"
        />
        <div>
          <div className="inv-sidebar-brand-title">8th Street Construction</div>
          <div className="inv-sidebar-brand-sub">Invoicing</div>
        </div>
      </div>
      <nav className="inv-nav">
        <div className="inv-nav-section">Workflows</div>
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("inv-nav-link", active && "active")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[var(--inv-border)]">
        <form action="/api/invoicing/auth" method="POST">
          <input type="hidden" name="action" value="logout" />
          <button type="submit" className="inv-btn inv-btn-ghost w-full">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
