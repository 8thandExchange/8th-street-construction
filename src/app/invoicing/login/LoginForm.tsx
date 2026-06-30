"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function InvoicingLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") ? "Invalid password" : "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/invoicing/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError("Invalid password");
        return;
      }

      router.push(searchParams.get("next") ?? "/invoicing");
      router.refresh();
    } catch {
      setError("Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inv-login-shell">
      <div className="inv-card inv-login-card">
        <div className="mb-6">
          <div className="inv-page-title">Sign in to Invoicing</div>
          <p className="inv-page-subtitle">
            Manage invoices, customers, and payment links for 8th Street Construction.
          </p>
        </div>

        {error ? <div className="inv-alert inv-alert-error">{error}</div> : null}

        <form onSubmit={handleSubmit} className="inv-form-grid">
          <div className="inv-field">
            <label className="inv-label" htmlFor="password">
              Admin password
            </label>
            <input
              id="password"
              type="password"
              className="inv-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="inv-btn inv-btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
