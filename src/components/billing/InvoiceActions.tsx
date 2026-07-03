"use client";

import { useState } from "react";

type InvoiceActionsProps = {
  mercuryPayUrl?: string | null;
  pdfUrl?: string | null;
  variant: "admin" | "client";
};

export function InvoiceActions({ mercuryPayUrl, pdfUrl, variant }: InvoiceActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyPayLink() {
    if (!mercuryPayUrl) return;
    await navigator.clipboard.writeText(mercuryPayUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-5 pt-4 border-t border-ink/8 flex flex-wrap items-center gap-3">
      {mercuryPayUrl && variant === "admin" && (
        <>
          <button
            type="button"
            onClick={copyPayLink}
            className="h-9 px-4 app-btn app-btn-secondary"
          >
            {copied ? "Copied ✓" : "Copy pay link"}
          </button>
          <a
            href={mercuryPayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 inline-flex items-center px-4 font-mono text-[10px] uppercase tracking-wider text-copper hover:underline"
          >
            Open Mercury page ↗
          </a>
        </>
      )}
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 inline-flex items-center px-4 app-btn app-btn-secondary"
        >
          Download PDF
        </a>
      )}
      {variant === "admin" && mercuryPayUrl && (
        <p className="w-full text-xs text-ink/45 leading-relaxed">
          Share the pay link with Habitat or the homeowner — branded on Mercury&apos;s secure checkout.
        </p>
      )}
      {!mercuryPayUrl && !pdfUrl && null}
    </div>
  );
}
