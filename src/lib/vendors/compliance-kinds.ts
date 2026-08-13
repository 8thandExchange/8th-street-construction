/** The kinds of vendor paperwork we track, shared by forms and actions. */
export const VENDOR_COMPLIANCE_KINDS = [
  { value: "coi", label: "Certificate of insurance" },
  { value: "w9", label: "W-9" },
  { value: "license", label: "Trade license" },
  { value: "lien_waiver", label: "Lien waiver" },
  { value: "other", label: "Other" },
] as const;

export type VendorComplianceKind = (typeof VENDOR_COMPLIANCE_KINDS)[number]["value"];
