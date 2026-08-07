"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Lock, Paperclip } from "lucide-react";
import type { InviteVendor } from "@/lib/vendors/onboarding";

const TAX_CLASSIFICATIONS = [
  "Sole proprietor",
  "Partnership",
  "C corporation",
  "S corporation",
  "LLC",
  "Trust/estate",
  "Other",
];

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-card p-6 md:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">{step}</p>
      <h2 className="mt-2 app-h2 !text-[17px]">{title}</h2>
      {hint && <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">{hint}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  span,
  ...props
}: {
  label: string;
  name: string;
  span?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input id={name} name={name} className="field-input w-full" {...props} />
    </div>
  );
}

export function VendorOnboardingForm({
  token,
  vendor,
}: {
  token: string;
  vendor: InviteVendor;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const account = String(fd.get("remit_account_number") ?? "").replace(/\D/g, "");
    const confirm = String(fd.get("remit_account_number_confirm") ?? "").replace(/\D/g, "");
    if (account !== confirm) {
      setError("The two account numbers don't match. Please re-enter them.");
      return;
    }

    const file = fileRef.current?.files?.[0];
    if (file) fd.set("w9", file);

    setBusy(true);
    try {
      const res = await fetch(`/api/vendor-form/${token}`, { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="app-card p-8 text-center">
        <CheckCircle2 size={32} strokeWidth={1.5} className="mx-auto text-copper" />
        <h2 className="mt-4 font-display text-2xl tracking-tight text-ink">Thank you</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/60">
          We've got everything we need. Your details are on file and future payments will go
          straight to your bank account. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Section
        step="Step 1"
        title="Your business"
        hint="The legal name should match your W-9 exactly — it's what we'll put on your 1099 at year end."
      >
        <Field
          label="Legal business name *"
          name="legal_name"
          required
          maxLength={200}
          defaultValue={vendor.legal_name ?? vendor.name}
          autoComplete="organization"
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          maxLength={40}
          defaultValue={vendor.phone ?? ""}
          autoComplete="tel"
        />
        <Field
          label="Email for payment notices *"
          name="contact_email"
          type="email"
          required
          maxLength={200}
          defaultValue={vendor.contact_email ?? ""}
          autoComplete="email"
        />
        <div>
          <label htmlFor="tax_classification" className="field-label">
            Business type *
          </label>
          <select
            id="tax_classification"
            name="tax_classification"
            required
            defaultValue={vendor.tax_classification ?? "LLC"}
            className="field-input w-full"
          >
            {TAX_CLASSIFICATIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Mailing address *"
          name="address"
          span
          required
          maxLength={400}
          placeholder="1234 Broad Street, Augusta GA 30901"
          defaultValue={vendor.address ?? ""}
          autoComplete="street-address"
        />
      </Section>

      <Section
        step="Step 2"
        title="Tax details"
        hint="We need this to issue your 1099. Uploading your W-9 is optional but saves us both a follow-up email."
      >
        <Field
          label="Tax ID (EIN or SSN) *"
          name="tax_id"
          required
          inputMode="numeric"
          maxLength={11}
          placeholder="12-3456789"
        />
        <div className="flex items-end">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="app-btn app-btn-secondary !h-9 max-w-full"
          >
            <Paperclip size={14} strokeWidth={1.75} />
            <span className="ml-1.5 truncate">
              {fileName ?? (vendor.hasW9 ? "Replace W-9" : "Attach W-9 (optional)")}
            </span>
          </button>
        </div>
      </Section>

      <Section
        step="Step 3"
        title="Where to send payment"
        hint={
          vendor.hasRemit
            ? "We already have an account on file. Entering new details here will replace it."
            : "This is the account we'll send your payments to."
        }
      >
        <Field
          label="Name on the account *"
          name="remit_account_name"
          span
          required
          maxLength={200}
          defaultValue={vendor.legal_name ?? vendor.name}
        />
        <div>
          <label htmlFor="remit_account_type" className="field-label">
            Account type *
          </label>
          <select
            id="remit_account_type"
            name="remit_account_type"
            required
            defaultValue="businessChecking"
            className="field-input w-full"
          >
            <option value="businessChecking">Business checking</option>
            <option value="businessSavings">Business savings</option>
            <option value="personalChecking">Personal checking</option>
            <option value="personalSavings">Personal savings</option>
          </select>
        </div>
        <Field
          label="Routing number *"
          name="remit_routing_number"
          required
          inputMode="numeric"
          maxLength={9}
          placeholder="061103975"
          autoComplete="off"
        />
        <Field
          label="Account number *"
          name="remit_account_number"
          required
          inputMode="numeric"
          maxLength={17}
          autoComplete="off"
        />
        <Field
          label="Confirm account number *"
          name="remit_account_number_confirm"
          required
          inputMode="numeric"
          maxLength={17}
          autoComplete="off"
          onPaste={(e) => e.preventDefault()}
        />
        <p className="sm:col-span-2 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink/50">
          <Lock size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <span>
            Sent over an encrypted connection straight to our records. We'll never ask you for
            these by email or over the phone.
          </span>
        </p>
      </Section>

      {error && (
        <p className="app-card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}

      <div className="flex justify-end pb-4">
        <button type="submit" disabled={busy} className="app-btn app-btn-primary">
          {busy && <Loader2 size={15} className="mr-2 animate-spin" />}
          {busy ? "Sending…" : "Submit my details"}
        </button>
      </div>
    </form>
  );
}
