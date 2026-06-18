import { mercuryConfigured } from "@/lib/mercury/config";
import { stripeConfigured } from "@/lib/stripe/config";

type BillingStatusBannerProps = {
  stripeReady: boolean;
  mercuryReady?: boolean;
  variant?: "admin" | "client";
};

export function BillingStatusBanner({
  stripeReady,
  mercuryReady = mercuryConfigured(),
  variant = "admin",
}: BillingStatusBannerProps) {
  if (stripeReady && mercuryReady) return null;

  const items: { label: string; detail: string; ok: boolean }[] = [
    {
      label: "Mercury invoicing",
      detail: mercuryReady
        ? "ACH & card payments via Mercury"
        : "Add MERCURY_API_TOKEN + MERCURY_DESTINATION_ACCOUNT_ID",
      ok: mercuryReady,
    },
    {
      label: "Stripe checkout",
      detail: stripeReady
        ? "Card pay in client portal"
        : "Add STRIPE_SECRET_KEY in Vercel",
      ok: stripeReady,
    },
  ];

  if (variant === "client" && mercuryReady) return null;

  return (
    <div className="mb-8 overflow-hidden border border-ink/10 bg-gradient-to-br from-paper via-bone/30 to-copper/[0.04]">
      <div className="px-5 py-4 border-b border-ink/8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-copper">
            Payment rails
          </p>
          <p className="mt-1 text-sm text-ink/70">
            {variant === "admin"
              ? "Connect Mercury for professional invoicing; Stripe powers in-portal card checkout."
              : "Your builder can enable online payment options for open invoices."}
          </p>
        </div>
      </div>
      <ul className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-ink/8">
        {items.map((item) => (
          <li key={item.label} className="px-5 py-4 flex items-start gap-3">
            <span
              className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                item.ok ? "bg-emerald-500" : "bg-amber-400"
              }`}
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="text-xs text-ink/50 mt-0.5 leading-relaxed">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {variant === "admin" && !mercuryReady && (
        <p className="px-5 py-3 text-xs text-ink/45 border-t border-ink/8 bg-paper/60">
          Until Mercury is connected, use &ldquo;Mark as paid&rdquo; when Habitat checks arrive.
        </p>
      )}
    </div>
  );
}
