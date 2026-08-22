export type ApprovalThresholds = {
  invoice: number;
  bill: number;
  purchaseOrder: number;
};

export const DEFAULT_APPROVAL_THRESHOLDS: ApprovalThresholds = {
  invoice: 25000,
  bill: 10000,
  purchaseOrder: 15000,
};

export function parseApprovalThresholds(value: unknown): ApprovalThresholds {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const read = (key: string, fallback: number) => {
    const n = Number(raw[key]);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    invoice: read("invoice", DEFAULT_APPROVAL_THRESHOLDS.invoice),
    bill: read("bill", DEFAULT_APPROVAL_THRESHOLDS.bill),
    purchaseOrder: read("purchaseOrder", DEFAULT_APPROVAL_THRESHOLDS.purchaseOrder),
  };
}

export function requiresThresholdConfirmation(
  kind: keyof ApprovalThresholds,
  amount: number,
  thresholds: ApprovalThresholds,
  confirmed: boolean
): { blocked: boolean; message?: string } {
  const limit = thresholds[kind];
  if (!Number.isFinite(amount) || amount <= limit) return { blocked: false };
  if (confirmed) return { blocked: false };
  const label =
    kind === "invoice" ? "invoice" : kind === "bill" ? "vendor bill" : "purchase order";
  return {
    blocked: true,
    message: `This ${label} is $${amount.toLocaleString("en-US")} and exceeds the $${limit.toLocaleString("en-US")} approval threshold. Confirm to continue.`,
  };
}
