import type { DrawTemplateLine } from "./constants";

export type AllocatedDraw = DrawTemplateLine & { amount: number };

/**
 * Convert a percent-based draw template into whole-dollar amounts that sum
 * EXACTLY to the contract value. Each draw is rounded independently, then the
 * final draw absorbs any rounding remainder so the schedule never drifts from
 * the contract by a dollar.
 */
export function allocateDrawAmounts(
  contractValue: number,
  template: DrawTemplateLine[]
): AllocatedDraw[] {
  const contract = Math.round(Number(contractValue) || 0);
  if (!template.length) return [];

  const allocated = template.map((d) => ({
    ...d,
    amount: Math.round((contract * d.percent) / 100),
  }));

  const drift = contract - allocated.reduce((s, d) => s + d.amount, 0);
  if (drift !== 0) {
    allocated[allocated.length - 1].amount += drift;
  }

  return allocated;
}
