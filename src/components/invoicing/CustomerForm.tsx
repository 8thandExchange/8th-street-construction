"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface CustomerFormValues {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

interface CustomerFormProps {
  mode: "create" | "edit";
  customerId?: string;
  initial?: Partial<CustomerFormValues>;
}

const EMPTY: CustomerFormValues = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
};

function buildPayload(values: CustomerFormValues) {
  const hasAddress =
    values.line1.trim() ||
    values.line2.trim() ||
    values.city.trim() ||
    values.state.trim() ||
    values.postalCode.trim();

  return {
    name: values.name.trim(),
    contactName: values.contactName.trim() || undefined,
    email: values.email.trim() || undefined,
    phone: values.phone.trim() || undefined,
    address: hasAddress
      ? {
          line1: values.line1.trim() || undefined,
          line2: values.line2.trim() || undefined,
          city: values.city.trim() || undefined,
          state: values.state.trim() || undefined,
          postal_code: values.postalCode.trim() || undefined,
          country: "US",
        }
      : undefined,
  };
}

export function CustomerForm({ mode, customerId, initial }: CustomerFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<CustomerFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = buildPayload(values);

    try {
      const response = await fetch(
        mode === "create" ? "/api/invoicing/customers" : `/api/invoicing/customers/${customerId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json()) as { error?: string; id?: string; customer?: { id: string } };
      if (!response.ok) {
        throw new Error(data.error ?? `Failed to ${mode === "create" ? "create" : "update"} customer`);
      }

      const id = mode === "create" ? data.id : data.customer?.id ?? customerId;
      router.push(`/invoicing/customers/${id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="inv-form-grid max-w-2xl">
      {error ? <div className="inv-alert inv-alert-error">{error}</div> : null}

      <div className="inv-card inv-detail-section inv-form-grid">
        <div className="inv-detail-label">Account</div>
        <div className="inv-field">
          <label className="inv-label" htmlFor="name">
            Company or customer name
          </label>
          <input
            id="name"
            className="inv-input"
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
          />
        </div>
      </div>

      <div className="inv-card inv-detail-section inv-form-grid inv-form-grid-2">
        <div className="inv-detail-label inv-form-grid-full">Contact</div>
        <div className="inv-field inv-form-grid-full">
          <label className="inv-label" htmlFor="contactName">
            Contact name
          </label>
          <input
            id="contactName"
            className="inv-input"
            value={values.contactName}
            onChange={(event) => updateField("contactName", event.target.value)}
            placeholder="Primary contact person"
          />
        </div>
        <div className="inv-field">
          <label className="inv-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="inv-input"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="billing@example.com"
          />
        </div>
        <div className="inv-field">
          <label className="inv-label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            className="inv-input"
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
          />
        </div>
      </div>

      <div className="inv-card inv-detail-section inv-form-grid">
        <div className="inv-detail-label">Billing address</div>
        <div className="inv-field">
          <label className="inv-label" htmlFor="line1">
            Street
          </label>
          <input
            id="line1"
            className="inv-input"
            value={values.line1}
            onChange={(event) => updateField("line1", event.target.value)}
          />
        </div>
        <div className="inv-field">
          <label className="inv-label" htmlFor="line2">
            Street line 2
          </label>
          <input
            id="line2"
            className="inv-input"
            value={values.line2}
            onChange={(event) => updateField("line2", event.target.value)}
            placeholder="Suite, unit, etc."
          />
        </div>
        <div className="inv-form-grid inv-form-grid-2">
          <div className="inv-field">
            <label className="inv-label" htmlFor="city">
              City
            </label>
            <input
              id="city"
              className="inv-input"
              value={values.city}
              onChange={(event) => updateField("city", event.target.value)}
            />
          </div>
          <div className="inv-field">
            <label className="inv-label" htmlFor="state">
              State
            </label>
            <input
              id="state"
              className="inv-input"
              value={values.state}
              onChange={(event) => updateField("state", event.target.value)}
            />
          </div>
        </div>
        <div className="inv-field max-w-xs">
          <label className="inv-label" htmlFor="postalCode">
            ZIP code
          </label>
          <input
            id="postalCode"
            className="inv-input"
            value={values.postalCode}
            onChange={(event) => updateField("postalCode", event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="inv-btn inv-btn-primary w-fit" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Save customer" : "Save changes"}
        </button>
        {mode === "edit" && customerId ? (
          <button
            type="button"
            className="inv-btn inv-btn-secondary w-fit"
            disabled={loading}
            onClick={() => router.push(`/invoicing/customers/${customerId}`)}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
