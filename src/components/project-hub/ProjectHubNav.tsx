"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Command", icon: "◆" },
  { href: "/overview", label: "Overview", icon: "◇" },
  { href: "/build", label: "Build", icon: "⬡" },
  { href: "/tasks", label: "Checklists", icon: "☑" },
  { href: "/schedule", label: "Schedule", icon: "▥" },
  { href: "/selections", label: "Selections", icon: "◈" },
  { href: "/daily-logs", label: "Logs", icon: "▦" },
  { href: "/milestones", label: "Timeline", icon: "◎" },
  { href: "/bid-requests", label: "Bids", icon: "◉" },
  { href: "/billing", label: "Billing", icon: "$" },
  { href: "/punch-list", label: "Punch", icon: "✎" },
  { href: "/updates", label: "Updates", icon: "▣" },
  { href: "/documents", label: "Docs", icon: "▤" },
  { href: "/messages", label: "Messages", icon: "◌" },
  { href: "/change-orders", label: "COs", icon: "△" },
] as const;

export function ProjectHubNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/admin/projects/${projectId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
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
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 font-mono text-[9px] tracking-[0.16em] uppercase border transition-colors ${
              active
                ? "bg-ink text-bone border-ink"
                : "bg-paper text-ink/70 border-ink/15 hover:border-ink/40 hover:text-ink"
            }`}
          >
            <span className="opacity-60">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
