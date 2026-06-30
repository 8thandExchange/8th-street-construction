"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductOption } from "@/lib/invoicing/types";

interface CreatePaymentLinkFormProps {
  products: ProductOption[];
}

export function CreatePaymentLinkForm({ products }: CreatePaymentLinkFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [priceId, setPriceId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allPrices = products.flatMap((product) =>
    product.prices.map((price) => ({
      ...price,
      productName: product.name,
    }))
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/invoicing/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          priceId: priceId || undefined,
          description: description || name,
          amount: priceId ? undefined : Math.round(Number(amount) * 100),
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to create payment link");

      router.refresh();
      setName("");
      setPriceId("");
      setDescription("");
      setAmount("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="inv-form-grid">
      {error ? <div className="inv-alert inv-alert-error">{error}</div> : null}

      <div className="inv-card inv-detail-section inv-form-grid inv-form-grid-2">
        <div className="inv-field">
          <label className="inv-label" htmlFor="link-name">
            Link name
          </label>
          <input
            id="link-name"
            className="inv-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Q2 retainer payment"
            required
          />
        </div>
        {allPrices.length > 0 ? (
          <div className="inv-field">
            <label className="inv-label" htmlFor="price">
              Stripe price
            </label>
            <select
              id="price"
              className="inv-select"
              value={priceId}
              onChange={(event) => setPriceId(event.target.value)}
            >
              <option value="">Custom amount</option>
              {allPrices.map((price) => (
                <option key={price.id} value={price.id}>
                  {price.productName}
                  {price.nickname ? ` — ${price.nickname}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {!priceId ? (
          <>
            <div className="inv-field">
              <label className="inv-label" htmlFor="description">
                Description
              </label>
              <input
                id="description"
                className="inv-input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>
            <div className="inv-field">
              <label className="inv-label" htmlFor="amount">
                Amount (USD)
              </label>
              <input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                className="inv-input"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
          </>
        ) : null}
      </div>

      <button type="submit" className="inv-btn inv-btn-primary w-fit" disabled={loading}>
        {loading ? "Creating..." : "Create payment link"}
      </button>
    </form>
  );
}
