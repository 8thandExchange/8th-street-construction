"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  { href: "/proposals", label: "Proposals" },
  { href: "/contracts", label: "Agreements" },
  { href: "/punch-list", label: "Punch List" },
  { href: "/messages", label: "Messages" },
  { href: "/change-orders", label: "Change Orders" },
] as const;

export function ClientProjectNav({
  projectId,
  enabledHrefs,
}: {
  projectId: string;
  /** Tab hrefs enabled for this project (from portal_features). Omit = all. */
  enabledHrefs?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/client/projects/${projectId}`;
  const enabled = enabledHrefs ? new Set(enabledHrefs) : null;
  const tabs = TABS.filter((tab) => tab.href === "" || !enabled || enabled.has(tab.href));
  const currentHref =
    tabs
      .map((tab) => `${base}${tab.href}`)
      .find((href) =>
        href === base ? pathname === base || pathname === `${base}/` : pathname.startsWith(href)
      ) ?? base;

  return (
    <nav aria-label="Project">
      <div className="sm:hidden">
        <label htmlFor="client-project-section" className="app-label mb-1.5 block">
          Project section
        </label>
        <select
          id="client-project-section"
          value={currentHref}
          onChange={(event) => router.push(event.target.value)}
          className="w-full"
        >
          {tabs.map((tab) => (
            <option key={tab.href} value={`${base}${tab.href}`}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden gap-2 overflow-x-auto pb-2 scrollbar-none sm:flex">
        {tabs.map((tab) => {
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
      </div>
    </nav>
  );
}
