import { mercuryConfigured } from "@/lib/mercury/config";

type BillingStatusBannerProps = {
  mercuryReady?: boolean;
  variant?: "admin" | "client";
};

/**
 * Shown only while Mercury is not connected. Mercury is the only payment
 * rail this company uses — free ACH invoicing — so there is nothing to
 * report once it is configured.
 */
export function BillingStatusBanner({
  mercuryReady = mercuryConfigured(),
  variant = "admin",
}: BillingStatusBannerProps) {
  if (mercuryReady) return null;

  return (
    <div className="mb-8 overflow-hidden border border-ink/10 bg-gradient-to-br from-paper via-bone/30 to-copper/[0.04]">
      <div className="px-5 py-4 border-b border-ink/8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-copper">
          Payment rails
        </p>
        <p className="mt-1 text-sm text-ink/70">
          {variant === "admin"
            ? "Mercury handles invoicing and ACH payments at no extra cost."
            : "Your builder can enable online payment options for open invoices."}
        </p>
      </div>
      <div className="px-5 py-4 flex items-start gap-3">
        <span className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-amber-400" aria-hidden />
        <div>
          <p className="text-sm font-medium text-ink">Mercury invoicing</p>
          <p className="text-xs text-ink/50 mt-0.5 leading-relaxed">
            {variant === "admin"
              ? "Add MERCURY_API_TOKEN + MERCURY_DESTINATION_ACCOUNT_ID"
              : "Not connected yet."}
          </p>
        </div>
      </div>
      {variant === "admin" && (
        <p className="px-5 py-3 text-xs text-ink/45 border-t border-ink/8 bg-paper/60">
          Until Mercury is connected, use &ldquo;Mark as paid&rdquo; when Habitat checks arrive.
        </p>
      )}
    </div>
  );
}
