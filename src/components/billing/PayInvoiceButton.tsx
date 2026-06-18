"use client";

import { useTransition } from "react";
import { createCheckoutSession } from "@/lib/actions/billing";

type PayInvoiceButtonProps = {
  invoiceId: string;
  variant?: "primary" | "secondary";
};

export function PayInvoiceButton({ invoiceId, variant = "primary" }: PayInvoiceButtonProps) {
  const [pending, start] = useTransition();

  const styles =
    variant === "primary"
      ? "bg-copper text-bone hover:bg-copper-400"
      : "border border-ink/20 text-ink hover:bg-ink hover:text-bone";

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
      className={`inline-flex h-11 items-center justify-center px-5 font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-50 transition-colors ${styles}`}
    >
      {pending ? "Loading…" : "Pay by card"}
    </button>
  );
}
