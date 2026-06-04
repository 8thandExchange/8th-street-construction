import { createAdminClient } from "@/lib/supabase/admin";
import {
  GEORGIA_RESIDENTIAL_PLAYBOOK,
  getPlaybookById,
  type GeorgiaPlaybook,
} from "@/lib/build/georgia-residential-playbook";

export type ApplyPlaybookResult = {
  ok: true;
  milestonesCreated: number;
  tasksCreated: number;
} | { error: string };

export async function applyPlaybookToProject(
  projectId: string,
  playbookId: string = GEORGIA_RESIDENTIAL_PLAYBOOK.id,
  options: { replaceExisting?: boolean; createdBy?: string } = {}
): Promise<ApplyPlaybookResult> {
  const playbook = getPlaybookById(playbookId);
  if (!playbook) return { error: "Playbook not found." };

  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, playbook_applied_at")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Project not found." };

  if (project.playbook_applied_at && !options.replaceExisting) {
    return { error: "Playbook already applied. Use replace to re-apply." };
  }

  if (options.replaceExisting) {
    await admin.from("project_tasks").delete().eq("project_id", projectId);
    await admin.from("project_milestones").delete().eq("project_id", projectId);
  }

  let milestonesCreated = 0;
  let tasksCreated = 0;

  for (let mi = 0; mi < playbook.milestones.length; mi++) {
    const phase = playbook.milestones[mi];
    const { data: milestone, error: mErr } = await admin
      .from("project_milestones")
      .insert({
        project_id: projectId,
        title: phase.title,
        description: phase.clientSummary,
        status: mi === 0 ? "in_progress" : "pending",
        display_order: mi,
        phase_key: phase.phaseKey,
        started_at: mi === 0 ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (mErr || !milestone) {
      return { error: mErr?.message ?? "Failed to create milestone." };
    }
    milestonesCreated++;

    const taskRows = phase.tasks.map((t, ti) => ({
      project_id: projectId,
      milestone_id: milestone.id,
      phase_key: phase.phaseKey,
      title: t.title,
      description: t.description ?? null,
      priority: t.priority ?? "normal",
      status: "todo" as const,
      display_order: ti,
      created_by: options.createdBy ?? null,
    }));

    const { error: tErr } = await admin.from("project_tasks").insert(taskRows);
    if (tErr) return { error: tErr.message };
    tasksCreated += taskRows.length;
  }

  await admin
    .from("projects")
    .update({
      playbook_id: playbook.id,
      playbook_applied_at: new Date().toISOString(),
      status: "pre_construction",
    })
    .eq("id", projectId);

  return { ok: true, milestonesCreated, tasksCreated };
}

export function getPlaybookProgress(
  milestones: { phase_key: string | null; status: string }[],
  tasks: { phase_key: string | null; status: string }[],
  playbook: GeorgiaPlaybook = GEORGIA_RESIDENTIAL_PLAYBOOK
) {
  return playbook.milestones.map((phase) => {
    const ms = milestones.filter((m) => m.phase_key === phase.phaseKey);
    const ts = tasks.filter((t) => t.phase_key === phase.phaseKey);
    const milestone = ms[0];
    const tasksDone = ts.filter((t) => t.status === "done").length;
    return {
      phaseKey: phase.phaseKey,
      title: phase.title,
      clientSummary: phase.clientSummary,
      milestoneStatus: milestone?.status ?? "pending",
      tasksTotal: ts.length,
      tasksDone,
      tasksPct: ts.length ? Math.round((tasksDone / ts.length) * 100) : 0,
    };
  });
}
