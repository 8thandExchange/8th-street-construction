"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CustomerSummary, ProductOption } from "@/lib/invoicing/types";
import { INVOICE_FOOTER } from "@/lib/site";
import { InvoicePreview } from "./InvoicePreview";

interface LineItemState {
  id: string;
  priceId: string;
  description: string;
  quantity: number;
  /** Per-unit price in dollars, e.g. "0.60" or "0.68055". */
  unitRate: string;
}

interface CreateInvoiceFormProps {
  customers: CustomerSummary[];
  products: ProductOption[];
}

/** Net-terms presets. value is days_until_due; "custom" reveals a date picker. */
const TERMS_PRESETS: { value: string; label: string; hint: string }[] = [
  { value: "0", label: "Due on receipt", hint: "Payable immediately" },
  { value: "7", label: "Net 7", hint: "7 days" },
  { value: "15", label: "Net 15", hint: "15 days" },
  { value: "30", label: "Net 30", hint: "30 days" },
  { value: "60", label: "Net 60", hint: "60 days" },
  { value: "custom", label: "Custom date", hint: "Pick a date" },
];

function emptyLineItem(): LineItemState {
  return {
    id: crypto.randomUUID(),
    priceId: "",
    description: "",
    quantity: 1,
    unitRate: "0.00",
  };
}

function parseUnitRateDollars(input: string): number {
  const value = Number(input);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Stripe unit_amount_decimal expects cents as a decimal string. */
function unitRateToCentsDecimal(rateDollars: number): string {
  const cents = rateDollars * 100;
  if (!Number.isFinite(cents) || cents < 0) return "0";
  return cents.toFixed(12).replace(/\.?0+$/, "");
}

function unitCentsFromRate(unitRate: string): number {
  return Number(unitRateToCentsDecimal(parseUnitRateDollars(unitRate)));
}

function lineTotalCents(item: Pick<LineItemState, "quantity" | "unitRate">): number {
  return unitCentsFromRate(item.unitRate) * item.quantity;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function CreateInvoiceForm({ customers, products }: CreateInvoiceFormProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [terms, setTerms] = useState<string>("30");
  const [customDate, setCustomDate] = useState<string>(
    toDateInputValue(addDays(new Date(), 30))
  );
  const [memo, setMemo] = useState("");
  const [footer, setFooter] = useState(INVOICE_FOOTER);
  const [lineItems, setLineItems] = useState<LineItemState[]>([emptyLineItem()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"send" | "draft" | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const allPrices = useMemo(
    () =>
      products.flatMap((product) =>
        product.prices.map((price) => ({ ...price, productName: product.name }))
      ),
    [products]
  );

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
  const customerHasEmail = Boolean(selectedCustomer?.email);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + lineTotalCents(item), 0),
    [lineItems]
  );

  const dueDate = useMemo(() => {
    if (terms === "custom") {
      const parsed = customDate ? new Date(`${customDate}T12:00:00`) : null;
      return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }
    return addDays(new Date(), Number(terms));
  }, [terms, customDate]);

  const previewData = useMemo(
    () => ({
      customerName: selectedCustomer?.name ?? "No customer selected",
      customerEmail: selectedCustomer?.email ?? null,
      lineItems: lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: unitCentsFromRate(item.unitRate),
      })),
      subtotal,
      total: subtotal,
      dueDate,
      dueOnReceipt: terms === "0",
      memo,
      footer,
    }),
    [selectedCustomer, lineItems, subtotal, dueDate, terms, memo, footer]
  );

  useEffect(() => {
    if (!showPreview) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setShowPreview(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPreview]);

  function updateLineItem(id: string, updates: Partial<LineItemState>) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  function handlePriceSelect(lineId: string, priceId: string) {
    const price = allPrices.find((entry) => entry.id === priceId);
    updateLineItem(lineId, {
      priceId,
      description: price
        ? `${price.productName}${price.nickname ? ` — ${price.nickname}` : ""}`
        : "",
      unitRate: ((price?.unitAmount ?? 0) / 100).toFixed(2),
    });
  }

  async function submit(mode: "send" | "draft") {
    setError(null);

    if (mode === "send" && !customerHasEmail) {
      setShowPreview(false);
      setError(
        "This customer has no email on file, so the invoice can't be emailed. Add an email on the customer record, or save it as a draft."
      );
      return;
    }
    if (subtotal <= 0) {
      setShowPreview(false);
      setError("Add at least one line item with an amount greater than $0.");
      return;
    }

    setLoading(mode);

    const payload: Record<string, unknown> = {
      customerId,
      memo,
      footer,
      autoSend: mode === "send",
      lineItems: lineItems.map((item) => ({
        priceId: item.priceId || undefined,
        description: item.description,
        quantity: item.quantity,
        unitAmountDecimal: item.priceId
          ? undefined
          : unitRateToCentsDecimal(parseUnitRateDollars(item.unitRate)),
      })),
    };

    if (terms === "custom") {
      if (!dueDate) {
        setShowPreview(false);
        setError("Pick a valid due date.");
        setLoading(null);
        return;
      }
      payload.dueDate = Math.floor(dueDate.getTime() / 1000);
    } else {
      payload.daysUntilDue = Number(terms);
    }

    try {
      const response = await fetch("/api/invoicing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to create invoice");

      router.push(`/invoicing/invoices/${data.id}`);
      router.refresh();
    } catch (submitError) {
      setShowPreview(false);
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="inv-form-grid">
      {error ? <div className="inv-alert inv-alert-error">{error}</div> : null}

      {/* Bill to + terms */}
      <div className="inv-card inv-detail-section inv-form-grid">
        <div className="inv-form-grid inv-form-grid-2">
          <div className="inv-field">
            <label className="inv-label" htmlFor="customer">
              Bill to
            </label>
            <select
              id="customer"
              className="inv-select"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              required
            >
              {customers.length === 0 ? (
                <option value="">Add a customer first</option>
              ) : (
                customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.email ? ` (${customer.email})` : ""}
                  </option>
                ))
              )}
            </select>
            {selectedCustomer && !customerHasEmail ? (
              <div className="inv-notice inv-notice-warn">
                No email on file — this customer can’t be emailed. Save as draft, or{" "}
                <a className="inv-link" href={`/invoicing/customers/${selectedCustomer.id}/edit`}>
                  add an email
                </a>
                .
              </div>
            ) : null}
          </div>

          <div className="inv-field">
            <label className="inv-label">Payment terms</label>
            <div className="inv-segmented" role="radiogroup" aria-label="Payment terms">
              {TERMS_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  role="radio"
                  aria-checked={terms === preset.value}
                  title={preset.hint}
                  className={`inv-segment ${terms === preset.value ? "active" : ""}`}
                  onClick={() => setTerms(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {terms === "custom" ? (
              <input
                type="date"
                className="inv-input mt-2"
                value={customDate}
                min={toDateInputValue(new Date())}
                onChange={(event) => setCustomDate(event.target.value)}
              />
            ) : null}
            <div className="inv-help">
              {dueDate ? (
                terms === "0" ? (
                  <>Due <strong>on receipt</strong> · {formatLongDate(dueDate)}</>
                ) : (
                  <>Due <strong>{formatLongDate(dueDate)}</strong></>
                )
              ) : (
                "Pick a valid due date"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="inv-card">
        <div className="inv-detail-section">
          <div className="inv-detail-label">Line items</div>
          <div className="inv-line-items">
            <div className="inv-line-head">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span className="inv-line-head-amount">Amount</span>
              <span aria-hidden />
            </div>
            {lineItems.map((item) => {
              const unitCents = unitCentsFromRate(item.unitRate);
              const lineTotal = lineTotalCents(item);
              return (
                <div key={item.id} className="inv-line-item">
                  <div className="inv-field">
                    {allPrices.length > 0 ? (
                      <select
                        className="inv-select"
                        value={item.priceId}
                        onChange={(event) => handlePriceSelect(item.id, event.target.value)}
                      >
                        <option value="">Custom line item</option>
                        {allPrices.map((price) => (
                          <option key={price.id} value={price.id}>
                            {price.productName}
                            {price.nickname ? ` — ${price.nickname}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <input
                      className="inv-input"
                      placeholder="Description"
                      value={item.description}
                      onChange={(event) =>
                        updateLineItem(item.id, { description: event.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="inv-field">
                    <label className="inv-label inv-line-mlabel" htmlFor={`qty-${item.id}`}>
                      Qty
                    </label>
                    <input
                      id={`qty-${item.id}`}
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      className="inv-input inv-input-qty"
                      value={item.quantity}
                      onChange={(event) =>
                        updateLineItem(item.id, {
                          quantity: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                  </div>

                  <div className="inv-field">
                    <label className="inv-label inv-line-mlabel" htmlFor={`rate-${item.id}`}>
                      Rate (USD)
                    </label>
                    <input
                      id={`rate-${item.id}`}
                      type="number"
                      min={0}
                      step="0.0001"
                      inputMode="decimal"
                      className="inv-input"
                      disabled={Boolean(item.priceId)}
                      value={item.unitRate}
                      onChange={(event) =>
                        updateLineItem(item.id, { unitRate: event.target.value })
                      }
                    />
                  </div>

                  <div className="inv-line-amount">
                    <span className="inv-line-amount-value">{money(lineTotal)}</span>
                    {item.quantity > 1 ? (
                      <span className="inv-line-calc">
                        {item.quantity.toLocaleString()} × {money(unitCents)}
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="inv-btn inv-btn-ghost inv-line-remove"
                    aria-label="Remove line item"
                    disabled={lineItems.length === 1}
                    onClick={() =>
                      setLineItems((items) =>
                        items.length === 1 ? items : items.filter((row) => row.id !== item.id)
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div className="inv-line-foot">
            <button
              type="button"
              className="inv-btn inv-btn-secondary"
              onClick={() => setLineItems((items) => [...items, emptyLineItem()])}
            >
              + Add line item
            </button>
            <div className="inv-totals">
              <div className="inv-totals-row">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="inv-totals-row inv-totals-grand">
                <span>Total due</span>
                <span>{money(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="inv-card inv-detail-section inv-form-grid inv-form-grid-2">
        <div className="inv-field">
          <label className="inv-label" htmlFor="memo">
            Memo
          </label>
          <textarea
            id="memo"
            className="inv-textarea"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="Optional note visible on the invoice"
          />
        </div>
        <div className="inv-field">
          <label className="inv-label" htmlFor="footer">
            Footer
          </label>
          <textarea
            id="footer"
            className="inv-textarea"
            value={footer}
            onChange={(event) => setFooter(event.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="inv-submit-bar">
        <div className="inv-submit-summary">
          <span className="inv-submit-total">{money(subtotal)}</span>
          <span className="inv-submit-meta">
            {selectedCustomer ? selectedCustomer.name : "No customer"} ·{" "}
            {dueDate
              ? terms === "0"
                ? "Due on receipt"
                : `Due ${formatLongDate(dueDate)}`
              : "No due date"}
          </span>
        </div>
        <div className="inv-action-row">
          <button
            type="button"
            className="inv-btn inv-btn-secondary"
            disabled={loading !== null || !customerId}
            onClick={() => submit("draft")}
          >
            {loading === "draft" ? "Saving…" : "Save as draft"}
          </button>
          <button
            type="button"
            className="inv-btn inv-btn-primary"
            disabled={loading !== null || !customerId || subtotal <= 0}
            onClick={() => {
              setError(null);
              setShowPreview(true);
            }}
          >
            Preview &amp; send
          </button>
        </div>
      </div>

      {showPreview ? (
        <div
          className="inv-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Invoice preview"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowPreview(false);
          }}
        >
          <div className="inv-modal">
            <div className="inv-modal-head">
              <div>
                <div className="inv-modal-title">Preview</div>
                <div className="inv-modal-sub">
                  This is what {selectedCustomer?.name ?? "the customer"} will receive.
                </div>
              </div>
              <button
                type="button"
                className="inv-btn inv-btn-ghost inv-modal-close"
                aria-label="Close preview"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>

            <div className="inv-modal-body">
              <InvoicePreview data={previewData} />
            </div>

            <div className="inv-modal-foot">
              {!customerHasEmail ? (
                <span className="inv-modal-foot-note">
                  No customer email — you can save a draft, but it can’t be emailed.
                </span>
              ) : (
                <span className="inv-modal-foot-note">
                  Sends via Stripe with a secure ACH bank transfer payment link.
                </span>
              )}
              <div className="inv-action-row">
                <button
                  type="button"
                  className="inv-btn inv-btn-secondary"
                  disabled={loading !== null}
                  onClick={() => setShowPreview(false)}
                >
                  Back to edit
                </button>
                <button
                  type="button"
                  className="inv-btn inv-btn-secondary"
                  disabled={loading !== null || !customerId}
                  onClick={() => submit("draft")}
                >
                  {loading === "draft" ? "Saving…" : "Save as draft"}
                </button>
                <button
                  type="button"
                  className="inv-btn inv-btn-primary"
                  disabled={loading !== null || !customerId || !customerHasEmail}
                  title={!customerHasEmail ? "Add a customer email to send" : undefined}
                  onClick={() => submit("send")}
                >
                  {loading === "send" ? "Sending…" : "Send invoice"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
