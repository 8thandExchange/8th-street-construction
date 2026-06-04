"use client";

import { useTransition } from "react";
import { createCheckoutSession } from "@/lib/actions/billing";

export function PayInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const { url } = await createCheckoutSession(invoiceId);
          if (url) window.location.href = url;
        })
      }
      className="h-9 px-4 bg-copper text-bone font-mono text-[10px] uppercase tracking-wider disabled:opacity-50"
    >
      {pending ? "Loading…" : "Pay Now"}
    </button>
  );
}
