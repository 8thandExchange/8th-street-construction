"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Command", icon: "◆" },
  { href: "/overview", label: "Overview", icon: "◇" },
  { href: "/build", label: "Build System", icon: "⬡" },
  { href: "/tasks", label: "Checklists", icon: "☑" },
  { href: "/milestones", label: "Timeline", icon: "◎" },
  { href: "/updates", label: "Updates", icon: "▣" },
  { href: "/documents", label: "Documents", icon: "▤" },
  { href: "/messages", label: "Messages", icon: "◉" },
  { href: "/change-orders", label: "Change Orders", icon: "△" },
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
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase border transition-colors ${
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
