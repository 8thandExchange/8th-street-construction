import { createClient } from "@/lib/supabase/server";

export type ProjectHubSummary = {
  milestoneTotal: number;
  milestoneCompleted: number;
  taskTotal: number;
  taskCompleted: number;
  playbookApplied: boolean;
  updateCount: number;
  documentCount: number;
  messageCount: number;
  pendingChangeOrders: number;
  clientEmail: string | null;
  clientName: string | null;
};

export async function loadProjectForHub(projectId: string) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, slug, title, subtitle, status, category, location, street_address, client_id, project_manager_id, start_date, target_completion_date, contract_value, hero_image_url, playbook_applied_at"
    )
    .eq("id", projectId)
    .single();

  if (!project) return null;

  const [
    milestonesRes,
    updatesRes,
    documentsRes,
    messagesRes,
    changeOrdersRes,
    tasksRes,
    clientRes,
  ] = await Promise.all([
    supabase.from("project_milestones").select("id, status").eq("project_id", projectId),
    supabase
      .from("project_updates")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabase
      .from("project_documents")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabase
      .from("project_messages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabase
      .from("change_orders")
      .select("id, status")
      .eq("project_id", projectId),
    supabase.from("project_tasks").select("id, status").eq("project_id", projectId),
    project.client_id
      ? supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("id", project.client_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const milestones = milestonesRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const summary: ProjectHubSummary = {
    milestoneTotal: milestones.length,
    milestoneCompleted: milestones.filter((m) => m.status === "completed").length,
    taskTotal: tasks.length,
    taskCompleted: tasks.filter((t) => t.status === "done").length,
    playbookApplied: Boolean(project.playbook_applied_at),
    updateCount: updatesRes.count ?? 0,
    documentCount: documentsRes.count ?? 0,
    messageCount: messagesRes.count ?? 0,
    pendingChangeOrders: (changeOrdersRes.data ?? []).filter(
      (c) => c.status === "pending_client"
    ).length,
    clientEmail: clientRes.data?.email ?? null,
    clientName: clientRes.data
      ? [clientRes.data.first_name, clientRes.data.last_name].filter(Boolean).join(" ") ||
        clientRes.data.email
      : null,
  };

  return { project, summary };
}
