"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
  hostedInvoiceUrl: string | null;
}

export function InvoiceActions({
  invoiceId,
  status,
  hostedInvoiceUrl,
}: InvoiceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(action: string) {
    setLoading(action);
    setMessage(null);

    try {
      const response = await fetch(`/api/invoicing/invoices/${invoiceId}/${action}`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "Action failed");
      setMessage(data.message ?? "Done");
      router.refresh();
    } catch (actionError) {
      setMessage(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="inv-form-grid">
      {message ? <div className="inv-alert inv-alert-success">{message}</div> : null}
      <div className="inv-action-row">
        {hostedInvoiceUrl ? (
          <a
            href={hostedInvoiceUrl}
            target="_blank"
            rel="noreferrer"
            className="inv-btn inv-btn-secondary"
          >
            View payment page
          </a>
        ) : null}
        {status === "open" ? (
          <>
            <button
              type="button"
              className="inv-btn inv-btn-secondary"
              disabled={!!loading}
              onClick={() => runAction("remind")}
            >
              {loading === "remind" ? "Sending..." : "Send reminder"}
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-secondary"
              disabled={!!loading}
              onClick={() => runAction("mark-paid")}
            >
              {loading === "mark-paid" ? "Updating..." : "Mark as paid"}
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-danger"
              disabled={!!loading}
              onClick={() => runAction("void")}
            >
              {loading === "void" ? "Voiding..." : "Void invoice"}
            </button>
          </>
        ) : null}
        {status === "draft" ? (
          <button
            type="button"
            className="inv-btn inv-btn-primary"
            disabled={!!loading}
            onClick={() => runAction("send")}
          >
            {loading === "send" ? "Sending..." : "Send invoice"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
