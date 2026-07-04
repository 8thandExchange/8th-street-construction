/**
 * Per-project client-portal feature toggles, stored in
 * projects.portal_features (jsonb). Absent key = enabled, so the empty
 * default turns everything on and toggles are pure opt-out.
 */

export const PORTAL_FEATURES = [
  { key: "schedule", label: "Schedule", href: "/schedule" },
  { key: "updates", label: "Updates", href: "/updates" },
  { key: "photos", label: "Photos", href: "/photos" },
  { key: "daily_logs", label: "Site Diary", href: "/daily-logs" },
  { key: "plans", label: "Plans", href: "/plans" },
  { key: "selections", label: "Selections", href: "/selections" },
  { key: "documents", label: "Documents", href: "/documents" },
  { key: "billing", label: "Billing", href: "/billing" },
  { key: "punch_list", label: "Punch List", href: "/punch-list" },
  { key: "messages", label: "Messages", href: "/messages" },
  { key: "change_orders", label: "Change Orders", href: "/change-orders" },
] as const;

export type PortalFeatureKey = (typeof PORTAL_FEATURES)[number]["key"];

export function isFeatureEnabled(features: unknown, key: PortalFeatureKey): boolean {
  if (!features || typeof features !== "object" || Array.isArray(features)) return true;
  return (features as Record<string, unknown>)[key] !== false;
}

export function enabledFeatureKeys(features: unknown): PortalFeatureKey[] {
  return PORTAL_FEATURES.filter((f) => isFeatureEnabled(features, f.key)).map((f) => f.key);
}
