import { BRAND, brandLogoUrl, getSiteUrl } from "@/lib/brand/assets";
import { EMAIL_BRAND, EMAIL_FONT } from "./brand";

const { parchment, paper, ink, inkMuted, navy, rust, pencil, border } = EMAIL_BRAND;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type EmailLayoutOptions = {
  title: string;
  preheader?: string;
  body: string;
};

export function emailLayout({ title, preheader, body }: EmailLayoutOptions) {
  const logo = brandLogoUrl("on-dark");
  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${parchment};font-family:${EMAIL_FONT.sans};color:${ink};">
  ${preheaderBlock}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${parchment};">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
          <tr>
            <td style="background:${navy};padding:28px 32px;text-align:center;">
              <a href="${getSiteUrl()}" style="text-decoration:none;">
                <img src="${logo}" alt="${BRAND.name}" width="240" height="56" style="display:inline-block;border:0;max-width:240px;height:auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px 48px;background:${parchment};">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 40px;background:${paper};border-top:1px solid ${border};text-align:center;">
              <div style="font-family:${EMAIL_FONT.sans};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${pencil};">${BRAND.name}</div>
              <div style="font-family:${EMAIL_FONT.sans};font-size:11px;color:${pencil};margin-top:6px;">${BRAND.tagline}</div>
              <div style="font-family:${EMAIL_FONT.sans};font-size:11px;color:${pencil};margin-top:10px;">${BRAND.parent}</div>
              <div style="font-family:${EMAIL_FONT.sans};font-size:11px;margin-top:16px;">
                <a href="${getSiteUrl()}" style="color:${rust};text-decoration:none;">8thstreetconstruction.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return html;
}

export function emailButton(href: string, label: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
    <tr>
      <td style="background:${ink};border-radius:0;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${EMAIL_FONT.sans};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${parchment};text-decoration:none;font-weight:600;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function emailSecondaryButton(href: string, label: string) {
  return `<p style="margin:16px 0 0;font-family:${EMAIL_FONT.sans};font-size:14px;">
    <a href="${href}" style="color:${rust};text-decoration:underline;">${escapeHtml(label)}</a>
  </p>`;
}

export function emailAmountBlock(amount: string, label: string) {
  return `<div style="margin:24px 0;padding:20px 24px;background:${paper};border-left:3px solid ${rust};">
    <div style="font-family:${EMAIL_FONT.sans};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${pencil};">${escapeHtml(label)}</div>
    <div style="font-family:${EMAIL_FONT.display};font-size:36px;color:${ink};margin-top:8px;line-height:1;">${escapeHtml(amount)}</div>
  </div>`;
}

export { escapeHtml };
