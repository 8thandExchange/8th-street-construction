import { EMAIL_BRAND, EMAIL_FONT } from "../brand";
import { emailButton, emailLayout, escapeHtml } from "../layout";

const { ink, inkMuted, pencil } = EMAIL_BRAND;

export type VendorOnboardingEmailPayload = {
  vendorName: string;
  formUrl: string;
  expiresFormatted: string;
};

export function vendorOnboardingEmail(payload: VendorOnboardingEmailPayload) {
  const body = `
    <p style="font-family:${EMAIL_FONT.sans};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${pencil};margin:0 0 12px;">Vendor setup</p>
    <h1 style="font-family:${EMAIL_FONT.display};font-size:30px;font-weight:500;line-height:1.2;margin:0 0 16px;color:${ink};">
      Let&rsquo;s get you set up for payment
    </h1>
    <p style="font-family:${EMAIL_FONT.sans};font-size:15px;line-height:1.7;color:${inkMuted};margin:0 0 16px;">
      Hello ${escapeHtml(payload.vendorName)} &mdash; we&rsquo;re adding you as a vendor so we can pay you
      by bank transfer (ACH) instead of mailing checks. The form below takes about three minutes.
    </p>
    <p style="font-family:${EMAIL_FONT.sans};font-size:15px;line-height:1.7;color:${inkMuted};margin:0 0 8px;">
      You&rsquo;ll be asked for:
    </p>
    <ul style="font-family:${EMAIL_FONT.sans};font-size:15px;line-height:1.8;color:${inkMuted};margin:0 0 20px;padding-left:20px;">
      <li>Your business name and mailing address</li>
      <li>Your tax ID (EIN), and a W-9 if you have one handy</li>
      <li>The bank account you&rsquo;d like payments sent to</li>
    </ul>
    ${emailButton(payload.formUrl, "Open the vendor form")}
    <p style="font-family:${EMAIL_FONT.sans};font-size:13px;line-height:1.7;color:${pencil};margin:24px 0 0;">
      This link is private to you and works once. It expires ${escapeHtml(payload.expiresFormatted)}.
      Please don&rsquo;t forward it &mdash; and please don&rsquo;t send us account numbers by email;
      the form is there so they never have to travel that way.
    </p>
  `;

  const text = [
    `Hello ${payload.vendorName} — we're adding you as a vendor so we can pay you by bank transfer (ACH).`,
    "",
    "Please fill in your details here:",
    payload.formUrl,
    "",
    "You'll need your business name and address, your tax ID (EIN), and the bank account you'd like payments sent to.",
    `This link is private to you, works once, and expires ${payload.expiresFormatted}.`,
    "Please don't send account numbers by email — use the form instead.",
  ].join("\n");

  return {
    subject: "Your vendor setup form — 8th Street Construction",
    html: emailLayout({
      title: "Vendor setup",
      preheader: "Three minutes to set up bank transfer payments.",
      body,
    }),
    text,
  };
}
