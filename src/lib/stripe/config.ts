export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
