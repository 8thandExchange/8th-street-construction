"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { InvoiceFilterStatus } from "@/lib/invoicing/types";

const statusTabs: { value: InvoiceFilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "draft", label: "Draft" },
  { value: "void", label: "Void" },
];

export function InvoiceFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const status = (searchParams.get("status") as InvoiceFilterStatus) || "all";
  const search = searchParams.get("q") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => {
        router.replace(`/invoicing/invoices?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="inv-filter-bar">
      <div className="inv-search">
        <span className="inv-search-icon" aria-hidden>
          ⌕
        </span>
        <input
          type="search"
          placeholder="Search invoices..."
          defaultValue={search}
          disabled={isPending}
          onChange={(event) => updateParams({ q: event.target.value || null })}
        />
      </div>
      <div className="inv-tabs">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`inv-tab ${status === tab.value ? "active" : ""}`}
            onClick={() => updateParams({ status: tab.value === "all" ? null : tab.value })}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
