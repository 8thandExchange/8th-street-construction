import Stripe from "stripe";

/** Surface the most useful Stripe error text for admin UI and logs. */
export function formatStripeError(error: unknown): string {
  if (error instanceof Stripe.errors.StripeError) {
    const parts = [error.message];
    if (error.code) parts.push(`(${error.code})`);
    return parts.join(" ");
  }

  if (error instanceof Error) return error.message;
  return "Something went wrong with Stripe";
}
