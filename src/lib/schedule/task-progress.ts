export type TaskProgressRow = {
  milestone_id: string | null;
  phase_key: string | null;
  status: string;
};

export type MilestoneProgressKey = {
  id: string;
  phase_key: string | null;
};

/**
 * Cancelled work has been taken out of scope, so it must not sit in the
 * progress denominator — otherwise a phase can never reach 100%.
 */
export function isCountableTask(task: { status: string }) {
  return task.status !== "cancelled";
}

export function computeMilestoneTaskProgress(
  milestones: MilestoneProgressKey[],
  tasks: TaskProgressRow[]
): Map<string, number> {
  const phaseToMilestone = new Map<string, string>();
  for (const milestone of milestones) {
    if (milestone.phase_key) phaseToMilestone.set(milestone.phase_key, milestone.id);
  }

  const counts = new Map<string, { done: number; total: number }>();

  for (const task of tasks) {
    if (!isCountableTask(task)) continue;

    const milestoneId =
      task.milestone_id ??
      (task.phase_key ? phaseToMilestone.get(task.phase_key) : undefined);
    if (!milestoneId) continue;

    const bucket = counts.get(milestoneId) ?? { done: 0, total: 0 };
    bucket.total += 1;
    if (task.status === "done") bucket.done += 1;
    counts.set(milestoneId, bucket);
  }

  const progress = new Map<string, number>();
  for (const [milestoneId, bucket] of counts) {
    progress.set(
      milestoneId,
      bucket.total ? Math.round((bucket.done / bucket.total) * 100) : 0
    );
  }

  return progress;
}
