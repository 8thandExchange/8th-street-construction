/**
 * Shared shape + guard for the structured "contact" site setting.
 * Plain module so both server components (admin settings page) and the
 * client editor can use it — calling a "use client" export from a server
 * render is an RSC error.
 */

export type ContactValue = {
  city: string | null;
  email: string | null;
  phone: string | null;
  service_area: string[];
};

export function isContactValue(value: unknown): value is ContactValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const stringOrNull = (x: unknown) => typeof x === "string" || x === null;
  return (
    stringOrNull(v.city) &&
    stringOrNull(v.email) &&
    stringOrNull(v.phone) &&
    Array.isArray(v.service_area) &&
    v.service_area.every((s) => typeof s === "string")
  );
}
