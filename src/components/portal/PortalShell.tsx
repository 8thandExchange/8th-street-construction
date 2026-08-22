"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface PortalShellProps {
  email: string;
  role: "client" | "subcontractor";
  children: React.ReactNode;
}

const NAV_CLIENT = [
  { href: "/client", label: "My Projects", exact: true },
  { href: "/client/assistant", label: "Concierge", exact: false },
];

const NAV_SUB = [
  { href: "/subs", label: "Active Bids", exact: true },
];

export function PortalShell({ email, role, children }: PortalShellProps) {
  const pathname = usePathname();
  const nav = role === "client" ? NAV_CLIENT : NAV_SUB;
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="portal-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-navy/[0.08] bg-white">
        <div className="mx-auto flex h-14 max-w-8xl items-center justify-between px-4 sm:h-16 sm:px-6 md:px-10 lg:px-14">
          <Link href="/" className="flex flex-col leading-none">
            <span className="text-[17px] font-semibold tracking-[-0.02em] text-navy">
              8<span className="italic">th</span> Street
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-copper">
              {role === "client" ? "Client Portal" : "Subcontractor Portal"}
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-[13px] font-medium transition-colors",
                    active ? "text-copper" : "text-ink/70 hover:text-ink"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="max-w-[180px] truncate text-xs app-muted" title={email}>
              {email}
            </div>
            <Link
              href="/account/password"
              className="text-xs font-medium app-muted hover:text-copper"
            >
              Password
            </Link>
            <button
              onClick={signOut}
              className="text-xs font-medium app-muted hover:text-copper"
            >
              Sign out
            </button>
          </nav>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open portal navigation"
            className="app-btn app-btn-ghost !h-9 !w-9 !p-0 md:hidden"
          >
            <Menu size={19} strokeWidth={1.75} />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close portal navigation"
            className="absolute inset-0 bg-navy/35"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-72 max-w-[88vw] flex-col bg-white shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-navy/[0.08] px-4">
              <span className="text-sm font-semibold text-navy">
                {role === "client" ? "Client portal" : "Subcontractor portal"}
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="app-btn app-btn-ghost !h-9 !w-9 !p-0"
              >
                <X size={19} strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {nav.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("app-nav-item", active && "app-nav-item-active")}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link href="/account/password" className="app-nav-item">
                Change password
              </Link>
            </nav>
            <div className="border-t border-navy/[0.08] p-4">
              <p className="mb-3 truncate text-xs app-muted" title={email}>
                {email}
              </p>
              <button
                type="button"
                onClick={signOut}
                className="app-btn app-btn-secondary w-full"
              >
                <LogOut size={15} strokeWidth={1.75} />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
