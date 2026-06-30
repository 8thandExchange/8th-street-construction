import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** Stripe client for invoicing — throws when STRIPE_SECRET_KEY is missing. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key, { typescript: true });
  }

  return stripeClient;
}

export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured");
  }
  return key;
}
