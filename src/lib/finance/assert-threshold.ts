import { loadApprovalThresholds } from "@/lib/finance/settings";
import {
  requiresThresholdConfirmation,
  type ApprovalThresholds,
} from "@/lib/finance/thresholds";

export async function assertApprovalThreshold(
  kind: keyof ApprovalThresholds,
  amount: number,
  formData: FormData
) {
  const thresholds = await loadApprovalThresholds();
  const confirmed = formData.get("confirm_over_threshold") === "on";
  const result = requiresThresholdConfirmation(kind, amount, thresholds, confirmed);
  if (result.blocked) throw new Error(result.message);
}
