"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/** Dashboard/auth routes — widget would clutter working UIs. */
const HIDDEN_PREFIXES = ["/admin", "/client", "/login", "/account", "/subs"];

/**
 * Public routes with phone-collecting forms. GHL Trust Center rejects sites where the
 * chat widget and an SMS/phone opt-in form appear on the same page.
 */
const HIDDEN_EXACT = ["/", "/contact", "/book"];

export function LeadConnectorChat() {
  const pathname = usePathname();
  if (HIDDEN_EXACT.includes(pathname)) return null;
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
