"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { sendVendorInvite } from "@/lib/actions/vendor-invites";

type Result = { url: string; emailed: boolean; emailError?: string | null };

function LinkBox({ result }: { result: Result }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the input below is selectable as a fallback.
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-copper/30 bg-copper/[0.04] p-4">
      <p className="text-[13px] font-medium text-navy">
        {result.emailed ? "Form sent ✓" : "Link created — send it yourself"}
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink/60">
        {result.emailed
          ? "They'll get an email with the link. It works once and expires in 14 days. Copy it below if you'd rather send it from your own inbox too."
          : result.emailError ??
            "Paste this into an email to them. It works once and expires in 14 days."}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={result.url}
          onFocus={(e) => e.currentTarget.select()}
          className="field-input w-full !text-[12px] font-mono"
        />
        <button type="button" onClick={copy} className="app-btn app-btn-secondary !h-9 shrink-0">
          {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
          <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Two modes. With `vendor`, it re-issues a link for someone already on file.
 * Without, it creates the vendor and the link in one step — the path for
 * "a new company just asked us to set them up".
 */
export function SendVendorInvite({
  vendor,
}: {
  vendor?: { id: string; name: string; contactEmail: string | null };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData(e.currentTarget);
      if (vendor) fd.set("vendor_id", vendor.id);
      const res = await sendVendorInvite(fd);
      if (!res || "error" in res) {
        setError(res?.error ? String(res.error) : "Could not create the link. Please try again.");
        return;
      }
      setResult({ url: res.url, emailed: res.emailed, emailError: res.emailError });
      if (!vendor) formRef.current?.reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {!vendor && (
          <div className="sm:col-span-2">
            <label htmlFor="invite_name" className="field-label">
              Company name *
            </label>
            <input
              id="invite_name"
              name="name"
              required
              placeholder="American Concrete Inc"
              className="field-input w-full"
            />
          </div>
        )}
        <div className={vendor ? "sm:col-span-2" : undefined}>
          <label htmlFor="invite_email" className="field-label">
            Send the form to *
          </label>
          <input
            id="invite_email"
            name="contact_email"
            type="email"
            required
            placeholder="office@company.com"
            defaultValue={vendor?.contactEmail ?? ""}
            className="field-input w-full"
          />
        </div>
        {!vendor && (
          <div>
            <label htmlFor="invite_phone" className="field-label">
              Phone
            </label>
            <input
              id="invite_phone"
              name="phone"
              placeholder="(706) 555-0100"
              className="field-input w-full"
            />
          </div>
        )}
        <div className="flex items-end justify-end sm:col-span-2">
          <button type="submit" disabled={busy} className="app-btn app-btn-primary !h-9">
            {busy ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <Send size={14} strokeWidth={1.75} className="mr-1.5" />
            )}
            {vendor ? "Send setup form" : "Add vendor & send form"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </form>
      {result && <LinkBox result={result} />}
    </>
  );
}
