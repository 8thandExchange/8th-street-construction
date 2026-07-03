"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Plain-language project navigation */
const GROUPS = [
  {
    label: "Job",
    items: [
      { href: "", label: "Command Center" },
      { href: "/overview", label: "Client & Funding" },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/build", label: "Build Plan" },
      { href: "/tasks", label: "Checklists" },
      { href: "/schedule", label: "Schedule" },
      { href: "/daily-logs", label: "Field Notes" },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/costs", label: "Our Cost Plan" },
      { href: "/bid-requests", label: "Sub Quotes" },
      { href: "/billing", label: "Client Invoices" },
      { href: "/change-orders", label: "Change Orders" },
    ],
  },
  {
    label: "Client",
    items: [
      { href: "/milestones", label: "Timeline" },
      { href: "/updates", label: "Updates" },
      { href: "/plans", label: "Plans" },
      { href: "/documents", label: "Files" },
      { href: "/messages", label: "Messages" },
      { href: "/selections", label: "Selections" },
      { href: "/punch-list", label: "Punch List" },
    ],
  },
] as const;

export function ProjectHubNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/admin/projects/${projectId}`;

  return (
    <nav className="hub-nav" aria-label="Project sections">
      <div className="flex gap-5 md:gap-8 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {GROUPS.map((group) => (
          <div key={group.label} className="shrink-0">
            <div className="app-nav-group !m-0 !mb-1.5 !px-1">{group.label}</div>
            <div className="flex gap-1">
              {group.items.map((tab) => {
                const href = `${base}${tab.href}`;
                const active =
                  tab.href === ""
                    ? pathname === base || pathname === `${base}/`
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={tab.href}
                    href={href}
                    className={`hub-nav-pill ${active ? "hub-nav-pill-active" : ""}`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
