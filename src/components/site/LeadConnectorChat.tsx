import Script from "next/script";
import { headers } from "next/headers";

/**
 * Dashboard/auth routes — widget would clutter working UIs.
 *
 * /vendor-form is here for a stronger reason than clutter: a vendor is
 * typing their routing and account numbers into that page, and a
 * third-party script has no business sharing the document with them.
 * A "question about building or renovating?" prompt is also nonsense to
 * show a subcontractor filling in a W-9.
 */
const HIDDEN_PREFIXES = ["/admin", "/client", "/login", "/account", "/subs", "/vendor-form"];

/**
 * Routes where the chat widget must not load for GHL widget-first A2P compliance:
 * - /book has a required phone field (booking form)
 * - /privacy and /terms are SMS legal pages (widget is the sole opt-in elsewhere)
 */
const HIDDEN_EXACT = ["/book", "/privacy", "/terms"];

export async function LeadConnectorChat() {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (!pathname || HIDDEN_EXACT.includes(pathname)) return null;
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <Script
      src="https://widgets.leadconnectorhq.com/loader.js"
      data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id="6a35c9495dcabc40b58bf949"
      data-source="WEB_USER"
      strategy="afterInteractive"
    />
  );
}
