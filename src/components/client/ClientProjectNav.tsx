"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/schedule", label: "Schedule" },
  { href: "/updates", label: "Updates" },
  { href: "/photos", label: "Photos" },
  { href: "/daily-logs", label: "Site Diary" },
  { href: "/plans", label: "Plans" },
  { href: "/selections", label: "Selections" },
  { href: "/documents", label: "Documents" },
  { href: "/billing", label: "Billing" },
  { href: "/punch-list", label: "Punch List" },
  { href: "/messages", label: "Messages" },
  { href: "/change-orders", label: "Change Orders" },
] as const;

export function ClientProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/client/projects/${projectId}`;

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Project">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const active =
          tab.href === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(href);
        return (
          <Link
            key={tab.href}
            href={href}
            className={`client-nav-pill shrink-0 ${active ? "client-nav-pill-active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
