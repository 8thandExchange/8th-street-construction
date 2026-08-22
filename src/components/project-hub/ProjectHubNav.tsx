"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
      { href: "/inspections", label: "Inspections" },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/costs", label: "Our Cost Plan" },
      { href: "/proposals", label: "Proposals" },
      { href: "/bid-requests", label: "Sub Quotes" },
      { href: "/purchase-orders", label: "Purchase Orders" },
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
  const router = useRouter();
  const base = `/admin/projects/${projectId}`;
  const currentHref =
    GROUPS.flatMap((group) => group.items)
      .map((tab) => `${base}${tab.href}`)
      .find((href) =>
        href === base ? pathname === base || pathname === `${base}/` : pathname.startsWith(href)
      ) ?? base;

  return (
    <nav className="hub-nav" aria-label="Project sections">
      <div className="sm:hidden">
        <label htmlFor="project-section" className="app-label mb-1.5 block">
          Project section
        </label>
        <select
          id="project-section"
          value={currentHref}
          onChange={(event) => router.push(event.target.value)}
          className="w-full"
        >
          {GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((tab) => (
                <option key={tab.href} value={`${base}${tab.href}`}>
                  {tab.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="-mx-1 hidden gap-5 overflow-x-auto px-1 pb-1 scrollbar-none sm:flex md:gap-8">
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
