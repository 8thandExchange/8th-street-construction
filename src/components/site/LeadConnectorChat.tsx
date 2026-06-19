"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/** Routes where the marketing chat widget should not appear (working dashboards/auth). */
const HIDDEN_PREFIXES = ["/admin", "/client", "/login", "/account", "/subs"];

export function LeadConnectorChat() {
  const pathname = usePathname();
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
