import type Stripe from "stripe";

const DEFAULT_PAYMENT_METHODS = ["us_bank_account"] as const;

const ALLOWED_PAYMENT_METHODS = new Set<string>([
  "ach_credit_transfer",
  "ach_debit",
  "acss_debit",
  "affirm",
  "amazon_pay",
  "au_becs_debit",
  "bacs_debit",
  "bancontact",
  "boleto",
  "card",
  "cashapp",
  "crypto",
  "customer_balance",
  "eps",
  "fpx",
  "giropay",
  "grabpay",
  "ideal",
  "kakao_pay",
  "klarna",
  "konbini",
  "kr_card",
  "link",
  "multibanco",
  "naver_pay",
  "nz_bank_account",
  "pay_by_bank",
  "payco",
  "paynow",
  "paypal",
  "payto",
  "pix",
  "promptpay",
  "revolut_pay",
  "sepa_debit",
  "sofort",
  "swish",
  "us_bank_account",
  "wechat_pay",
  "zip",
]);

function parsePaymentMethodTypes(raw: string): Stripe.InvoiceCreateParams.PaymentSettings.PaymentMethodType[] {
  const types = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const invalid = types.filter((type) => !ALLOWED_PAYMENT_METHODS.has(type));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid INVOICING_PAYMENT_METHODS value(s): ${invalid.join(", ")}. Use comma-separated Stripe invoice payment method types.`
    );
  }

  return types as Stripe.InvoiceCreateParams.PaymentSettings.PaymentMethodType[];
}

/** Resolved invoice payment method types (ACH-only by default). */
export function getInvoicingPaymentMethodTypes(): Stripe.InvoiceCreateParams.PaymentSettings.PaymentMethodType[] {
  const raw = process.env.INVOICING_PAYMENT_METHODS?.trim();

  if (raw === "dashboard") {
    return [...DEFAULT_PAYMENT_METHODS];
  }

  return parsePaymentMethodTypes(raw || DEFAULT_PAYMENT_METHODS.join(","));
}

/** Invoice payment methods: ACH-only by default; set to "dashboard" to use Stripe defaults. */
export function getInvoicePaymentSettings():
  | Stripe.InvoiceCreateParams["payment_settings"]
  | undefined {
  const raw = process.env.INVOICING_PAYMENT_METHODS?.trim();

  if (raw === "dashboard") {
    return undefined;
  }

  const paymentMethodTypes = getInvoicingPaymentMethodTypes();
  if (paymentMethodTypes.length === 0) {
    return undefined;
  }

  return { payment_method_types: paymentMethodTypes };
}
