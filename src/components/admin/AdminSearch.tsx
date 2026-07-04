"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Building2,
  CalendarClock,
  FileStack,
  HardHat,
  LayoutDashboard,
  MessageSquareQuote,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

type SearchResult = {
  type: "project" | "lead" | "consultation";
  id: string;
  label: string;
  sublabel: string;
  href: string;
};

type Command = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  keywords: string;
};

const NAV_COMMANDS: Command[] = [
  { id: "home", label: "Company Home", sublabel: "Go to", href: "/admin", icon: LayoutDashboard, keywords: "dashboard home overview" },
  { id: "assistant", label: "Assistant", sublabel: "Go to", href: "/admin/assistant", icon: Sparkles, keywords: "ai chat assistant invoice help" },
  { id: "projects", label: "Projects", sublabel: "Go to", href: "/admin/projects", icon: Building2, keywords: "jobs builds projects" },
  { id: "invoicing", label: "Invoicing", sublabel: "Go to", href: "/admin/invoicing", icon: Banknote, keywords: "money billing invoices mercury payments" },
  { id: "leads", label: "Leads", sublabel: "Go to", href: "/admin/leads", icon: Users, keywords: "pipeline leads prospects" },
  { id: "consultations", label: "Consultations", sublabel: "Go to", href: "/admin/consultations", icon: CalendarClock, keywords: "meetings bookings consultations" },
  { id: "subs", label: "Subcontractors", sublabel: "Go to", href: "/admin/subcontractors", icon: HardHat, keywords: "subs trades vendors subcontractors" },
  { id: "base-plans", label: "Base Plans", sublabel: "Go to", href: "/admin/base-plans", icon: FileStack, keywords: "plans catalog house base" },
  { id: "compliance", label: "Compliance", sublabel: "Go to", href: "/admin/compliance", icon: ShieldCheck, keywords: "insurance license compliance" },
  { id: "users", label: "Portal Users", sublabel: "Go to", href: "/admin/users", icon: UserRound, keywords: "clients users portal access" },
  { id: "testimonials", label: "Testimonials", sublabel: "Go to", href: "/admin/testimonials", icon: MessageSquareQuote, keywords: "reviews testimonials" },
  { id: "settings", label: "Settings", sublabel: "Go to", href: "/admin/settings", icon: Settings, keywords: "settings site config" },
];

type Item =
  | { kind: "command"; command: Command }
  | { kind: "result"; result: SearchResult }
  | { kind: "assistant"; query: string };

/** ⌘K command palette: navigate anywhere, find any record, or hand the
 *  query to the AI assistant. Sidebar shows a trigger that opens it. */
export function AdminSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Record search (projects/leads/consultations)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        setResults(json.results ?? []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const commands = q
      ? NAV_COMMANDS.filter(
          (c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q)
        )
      : NAV_COMMANDS;
    const list: Item[] = [
      ...results.map((result): Item => ({ kind: "result", result })),
      ...commands.map((command): Item => ({ kind: "command", command })),
    ];
    if (q.length >= 3) {
      list.push({ kind: "assistant", query: query.trim() });
    }
    return list;
  }, [query, results]);

  useEffect(() => {
    setActive(0);
  }, [items.length, query]);

  const run = useCallback(
    (item: Item) => {
      setOpen(false);
      if (item.kind === "command") router.push(item.command.href);
      else if (item.kind === "result") router.push(item.result.href);
      else router.push(`/admin/assistant?q=${encodeURIComponent(item.query)}`);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) run(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <>
      <div className="px-3 mb-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border border-navy/15 bg-white/60 px-2.5 py-1.5 text-left text-sm text-navy/45 transition-colors hover:border-copper/40"
        >
          <Search size={13} className="shrink-0" />
          <span className="flex-1 truncate">Search or command…</span>
          <kbd className="rounded border border-navy/15 bg-white px-1.5 py-0.5 text-[10px] font-mono text-navy/50">
            ⌘K
          </kbd>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-navy/40 backdrop-blur-[2px] px-4 pt-[12vh]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-xl border border-navy/15 bg-bone shadow-2xl">
            <div className="flex items-center gap-3 border-b border-navy/10 px-4">
              <Search size={16} className="shrink-0 text-navy/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a page, job, lead — or anything for the Assistant…"
                className="w-full bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-navy/35"
              />
              <kbd className="shrink-0 rounded border border-navy/15 px-1.5 py-0.5 text-[10px] font-mono text-navy/50">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
              {loading && results.length === 0 && query.trim().length >= 2 && (
                <div className="px-4 py-2 text-xs font-mono text-ink/40">Searching records…</div>
              )}
              {items.map((item, i) => {
                const isActive = i === active;
                const rowClass = `w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  isActive ? "bg-copper/10" : "hover:bg-paper"
                }`;
                if (item.kind === "result") {
                  return (
                    <button
                      key={`r-${item.result.type}-${item.result.id}`}
                      data-idx={i}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => run(item)}
                      className={rowClass}
                    >
                      <Building2 size={15} className="shrink-0 text-copper" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{item.result.label}</span>
                        <span className="block truncate text-[10px] font-mono uppercase tracking-wider text-stone-200">
                          {item.result.sublabel}
                        </span>
                      </span>
                    </button>
                  );
                }
                if (item.kind === "command") {
                  const Icon = item.command.icon;
                  return (
                    <button
                      key={`c-${item.command.id}`}
                      data-idx={i}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => run(item)}
                      className={rowClass}
                    >
                      <Icon size={15} className="shrink-0 text-navy/50" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {item.command.label}
                      </span>
                      <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-stone-200">
                        {item.command.sublabel}
                      </span>
                    </button>
                  );
                }
                return (
                  <button
                    key="assistant"
                    data-idx={i}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(item)}
                    className={`${rowClass} border-t border-navy/10 mt-1 pt-3`}
                  >
                    <Sparkles size={15} className="shrink-0 text-copper" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      Ask Assistant: <span className="text-copper">“{item.query}”</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-stone-200">
                      AI
                    </span>
                  </button>
                );
              })}
              {items.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-ink/50">
                  Keep typing — or press Enter on “Ask Assistant” for anything free-form.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
