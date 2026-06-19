"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AdminSearch } from "@/components/admin/AdminSearch";

const NAV = [
  { href: "/admin", label: "Company Home", exact: true },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/consultations", label: "Consultations" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/base-plans", label: "Base Plans" },
  { href: "/admin/compliance", label: "Compliance" },
  { href: "/admin/subcontractors", label: "Subcontractors" },
  { href: "/admin/users", label: "Portal Users" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <aside className="w-64 shrink-0 bg-navy text-bone h-screen sticky top-0 flex flex-col">
      <div className="px-6 py-8 border-b border-bone/10">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-display text-xl text-bone">
            8<span className="italic">th</span> Street
          </span>
          <span className="eyebrow text-copper-100 mt-1">Admin</span>
        </Link>
      </div>

      <div className="pt-6 pb-2">
        <AdminSearch />
      </div>

      <nav className="flex-1 px-3 pb-6">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block px-3 py-2.5 text-sm transition-colors duration-300",
                "border-l-2",
                active
                  ? "border-copper text-bone bg-bone/5"
                  : "border-transparent text-bone/60 hover:text-bone hover:border-bone/30"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-6 border-t border-bone/10">
        <div className="text-xs text-bone/40 mb-1">Signed in as</div>
        <div className="text-sm text-bone/80 truncate" title={userEmail}>
          {userEmail}
        </div>
        <Link
          href="/account/password"
          className="mt-4 block text-xs font-mono tracking-[0.15em] uppercase text-bone/50 hover:text-copper-100 transition-colors"
        >
          Change Password
        </Link>
        <button
          onClick={signOut}
          className="mt-3 w-full text-left text-xs font-mono tracking-[0.15em] uppercase text-bone/50 hover:text-copper-100 transition-colors"
        >
          Sign Out →
        </button>
      </div>
    </aside>
  );
}
