"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-bone flex flex-col">
      <header className="border-b border-ink/10 bg-bone sticky top-0 z-30">
        <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14 h-20 flex items-center justify-between">
          <Link href="/" className="flex flex-col leading-none">
            <span className="font-display text-2xl text-ink">
              8<span className="italic">th</span> Street
            </span>
            <span className="eyebrow mt-0.5">
              {role === "client" ? "Client Portal" : "Subcontractor Portal"}
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm transition-colors",
                    active ? "text-copper" : "text-ink/70 hover:text-ink"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="text-xs text-stone-300 font-mono truncate max-w-[200px]" title={email}>
              {email}
            </div>
            <Link
              href="/account/password"
              className="text-xs font-mono tracking-[0.15em] uppercase text-stone-300 hover:text-copper"
            >
              Password
            </Link>
            <button
              onClick={signOut}
              className="text-xs font-mono tracking-[0.15em] uppercase text-stone-300 hover:text-copper"
            >
              Sign Out →
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
