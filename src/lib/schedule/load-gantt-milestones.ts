import type { SupabaseClient } from "@supabase/supabase-js";
import type { GanttMilestone } from "./gantt";
import { computeMilestoneTaskProgress } from "./task-progress";

export async function loadGanttMilestones(
  supabase: SupabaseClient,
  projectId: string
): Promise<GanttMilestone[]> {
  const [{ data: milestones }, { data: tasks }] = await Promise.all([
    supabase
      .from("project_milestones")
      .select(
        "id, title, status, target_date, scheduled_start, scheduled_end, display_order, phase_key, predecessor_id, description, completed_at"
      )
      .eq("project_id", projectId)
      .order("display_order", { ascending: true }),
    supabase
      .from("project_tasks")
      .select("milestone_id, phase_key, status")
      .eq("project_id", projectId),
  ]);

  const progressMap = computeMilestoneTaskProgress(
    (milestones ?? []).map((milestone) => ({
      id: milestone.id,
      phase_key: milestone.phase_key ?? null,
    })),
    (tasks ?? []).map((task) => ({
      milestone_id: task.milestone_id,
      phase_key: task.phase_key ?? null,
      status: task.status,
    }))
  );

  return (milestones ?? []).map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    status: milestone.status,
    target_date: milestone.target_date,
    scheduled_start: milestone.scheduled_start,
    scheduled_end: milestone.scheduled_end,
    display_order: milestone.display_order,
    progress: progressMap.get(milestone.id) ?? null,
    predecessor_id: milestone.predecessor_id ?? null,
    description: milestone.description ?? null,
    completed_at: milestone.completed_at ?? null,
  }));
}
