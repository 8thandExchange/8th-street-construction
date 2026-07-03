"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  type: "project" | "lead" | "consultation";
  id: string;
  label: string;
  sublabel: string;
  href: string;
};

export function AdminSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
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
        setActive(0);
        setOpen(true);
      } catch {
        /* aborted or failed */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[active];
      if (target) go(target.href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative px-3 mb-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search jobs, leads…"
        aria-label="Search jobs, leads, and consultations"
        className="w-full !py-1.5 text-sm"
      />
      {open && (
        <div className="absolute left-3 right-3 mt-1 z-30 app-card !shadow-lg max-h-96 overflow-hidden overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-ink/50 font-mono">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-ink/50 font-mono">No matches.</div>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r.href)}
                    className={`w-full text-left px-3 py-2.5 block transition-colors ${
                      i === active ? "bg-copper/10" : "hover:bg-bone"
                    }`}
                  >
                    <div className="text-sm text-ink truncate">{r.label}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 truncate">
                      {r.sublabel}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
