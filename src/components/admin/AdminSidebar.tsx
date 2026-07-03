"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Building2,
  CalendarClock,
  FileStack,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AdminSearch } from "@/components/admin/AdminSearch";

const NAV_GROUPS: {
  label: string | null;
  items: { href: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; exact?: boolean }[];
}[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "Company Home", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Pipeline",
    items: [
      { href: "/admin/leads", label: "Leads", icon: Users },
      { href: "/admin/consultations", label: "Consultations", icon: CalendarClock },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/admin/projects", label: "Projects", icon: Building2 },
      { href: "/admin/base-plans", label: "Base Plans", icon: FileStack },
      { href: "/admin/subcontractors", label: "Subcontractors", icon: HardHat },
    ],
  },
  {
    label: "Money",
    items: [{ href: "/admin/invoicing", label: "Invoicing", icon: Banknote }],
  },
  {
    label: "Company",
    items: [
      { href: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
      { href: "/admin/users", label: "Portal Users", icon: UserRound },
      { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-6">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label ?? gi}>
          {group.label && <div className="app-nav-group">{group.label}</div>}
          {!group.label && gi === 0 && <div className="h-2" />}
          {group.items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn("app-nav-item", active && "app-nav-item-active")}
              >
                <Icon size={16} strokeWidth={1.75} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ userEmail }: { userEmail: string }) {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="border-t border-navy/10 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white">
          {userEmail.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-navy" title={userEmail}>
            {userEmail}
          </div>
          <Link href="/account/password" className="text-xs app-muted hover:text-copper transition-colors">
            Change password
          </Link>
        </div>
        <button
          onClick={signOut}
          title="Sign out"
          className="app-btn app-btn-ghost !h-8 !w-8 !p-0 rounded-md"
        >
          <LogOut size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <Link href="/admin" className="flex items-baseline gap-2 leading-none">
      <span className="font-display text-lg font-semibold text-navy">
        8<span className="italic">th</span> Street
      </span>
      <span className="app-label !text-copper">Ops</span>
    </Link>
  );
}

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on route change and lock scroll while open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="app-sidebar sticky top-0 z-40 flex h-14 items-center justify-between border-b border-navy/10 px-4 lg:hidden">
        <BrandMark />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="app-btn app-btn-ghost !h-9 !w-9 !p-0 rounded-md"
        >
          <Menu size={19} strokeWidth={1.75} />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setOpen(false)} />
          <aside className="app-sidebar absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-navy/10 px-4">
              <BrandMark />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="app-btn app-btn-ghost !h-9 !w-9 !p-0 rounded-md"
              >
                <X size={19} strokeWidth={1.75} />
              </button>
            </div>
            <div className="px-3 pb-2 pt-4">
              <AdminSearch />
            </div>
            <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            <SidebarFooter userEmail={userEmail} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="app-sidebar sticky top-0 hidden h-screen w-60 shrink-0 flex-col lg:flex">
        <div className="px-5 pb-2 pt-6">
          <BrandMark />
        </div>
        <div className="px-3 pb-2 pt-4">
          <AdminSearch />
        </div>
        <NavList pathname={pathname} />
        <SidebarFooter userEmail={userEmail} />
      </aside>
    </>
  );
}
