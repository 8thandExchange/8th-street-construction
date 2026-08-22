export function ThresholdConfirm({
  amount,
  limit,
  noun,
}: {
  amount: number;
  limit: number;
  noun: string;
}) {
  if (!Number.isFinite(amount) || amount <= limit) return null;
  return (
    <label className="flex items-start gap-2 text-xs text-navy/80">
      <input type="checkbox" name="confirm_over_threshold" className="mt-0.5 h-4 w-4 accent-copper" />
      <span>
        This {noun} is{" "}
        <span className="app-num">
          ${amount.toLocaleString("en-US")}
        </span>{" "}
        and exceeds the ${limit.toLocaleString("en-US")} approval threshold. Confirm to continue.
      </span>
    </label>
  );
}
