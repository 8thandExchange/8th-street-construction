export type MacJob = {
  projectId: string;
  title: string;
  contract: number | null;
  revisedBudget: number;
  spent: number;
  forecastCost: number;
  marginAtBudget: number | null;
  marginAtCompletion: number | null;
  reason: string;
};

export function forecastJobCost(revisedBudget: number, spent: number): number {
  return Math.round(Math.max(revisedBudget, spent) * 100) / 100;
}

export function explainMacVariance(revisedBudget: number, spent: number): string {
  if (revisedBudget <= 0 && spent <= 0) return "No cost plan yet.";
  if (spent > revisedBudget) {
    const over = Math.round((spent - revisedBudget) * 100) / 100;
    return `Spend already exceeds the revised budget by $${over.toLocaleString("en-US")}. MAC uses current spend.`;
  }
  if (spent === 0) return "No committed or actual spend yet. MAC equals margin at budget.";
  return "On or under budget. MAC matches margin at budget.";
}

export function marginAtCompletion(input: {
  projectId: string;
  title: string;
  contract: number | null;
  revisedBudget: number;
  spent: number;
}): MacJob {
  const forecastCost = forecastJobCost(input.revisedBudget, input.spent);
  const marginAtBudget =
    input.contract == null ? null : Math.round((input.contract - input.revisedBudget) * 100) / 100;
  const marginAtCompletionValue =
    input.contract == null ? null : Math.round((input.contract - forecastCost) * 100) / 100;
  return {
    ...input,
    forecastCost,
    marginAtBudget,
    marginAtCompletion: marginAtCompletionValue,
    reason: explainMacVariance(input.revisedBudget, input.spent),
  };
}
